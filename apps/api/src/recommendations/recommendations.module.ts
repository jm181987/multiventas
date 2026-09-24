import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsString } from 'class-validator';
import { OrderStatus, ProductStatus, StoreStatus } from '@multiventas/db';
import { DbService } from '../common/db.service';
import { AuthUser, CurrentUser, SystemContext } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards';
import { StorageService } from '../storage/storage.module';

class RecentProductsDto {
  @IsArray() @ArrayMaxSize(24) @IsString({ each: true }) ids!: string[];
}

@Injectable()
class RecommendationsService {
  constructor(private readonly db: DbService, private readonly storage: StorageService) {}

  private normalizeProduct<T>(product: T): T {
    const value = product as any;
    if (!value) return product;
    return {
      ...value,
      store: value.store ? {
        ...value.store,
        logoUrl: value.store.logoUrl ? this.storage.normalizeMediaUrl(value.store.logoUrl) : null,
        coverUrl: value.store.coverUrl ? this.storage.normalizeMediaUrl(value.store.coverUrl) : null,
      } : value.store,
      images: (value.images ?? []).map((image: any) => ({
        ...image,
        url: this.storage.normalizeProductImageUrl(image.url),
      })),
    } as T;
  }

  private include = {
    images: { orderBy: { sortOrder: 'asc' as const } },
    store: true,
    category: true,
    deliveryOptions: { where: { isActive: true }, orderBy: { type: 'asc' as const } },
  };

  private publicWhere = {
    status: ProductStatus.ACTIVE,
    deletedAt: null,
    store: { status: StoreStatus.ACTIVE, deletedAt: null },
  };

  async similar(productId: string) {
    return this.db.runSystem(async () => {
      const source = await this.db.client.product.findFirst({
        where: { id: productId, ...this.publicWhere },
        select: {
          id: true,
          storeId: true,
          categoryId: true,
          price: true,
        },
      });
      if (!source) return [];

      const candidates = await this.db.client.product.findMany({
        where: {
          ...this.publicWhere,
          id: { not: source.id },
          OR: [
            ...(source.categoryId ? [{ categoryId: source.categoryId }] : []),
            { storeId: source.storeId },
          ],
        },
        include: this.include,
        orderBy: { createdAt: 'desc' },
        take: 30,
      });

      const sourcePrice = Number(source.price);
      return candidates
        .map((product) => {
          let score = 0;
          if (source.categoryId && product.categoryId === source.categoryId) score += 8;
          if (product.storeId === source.storeId) score += 3;
          const productPrice = Number(product.price);
          if (sourcePrice > 0) {
            const ratio = Math.abs(productPrice - sourcePrice) / sourcePrice;
            if (ratio <= 0.2) score += 3;
            else if (ratio <= 0.5) score += 1;
          }
          return { product, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(({ product }) => this.normalizeProduct(product));
    });
  }

  async recent(ids: string[]) {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean))).slice(0, 24);
    if (!uniqueIds.length) return [];

    return this.db.runSystem(async () => {
      const products = await this.db.client.product.findMany({
        where: {
          ...this.publicWhere,
          id: { in: uniqueIds },
        },
        include: this.include,
      });
      const byId = new Map(products.map((product) => [product.id, product]));
      return uniqueIds
        .map((id) => byId.get(id))
        .filter(Boolean)
        .slice(0, 8)
        .map((product) => this.normalizeProduct(product!));
    });
  }

  async personalized(userId: string) {
    return this.db.runSystem(async () => {
      const [favorites, orderItems] = await Promise.all([
        this.db.client.favorite.findMany({
          where: { userId },
          include: {
            product: {
              select: { id: true, categoryId: true, storeId: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 30,
        }),
        this.db.client.orderItem.findMany({
          where: {
            productId: { not: null },
            order: {
              buyerId: userId,
              status: { in: [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
            },
          },
          select: {
            productId: true,
            product: { select: { categoryId: true, storeId: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 40,
        }),
      ]);

      const categoryWeights = new Map<string, number>();
      const storeWeights = new Map<string, number>();
      const excluded = new Set<string>();

      for (const favorite of favorites) {
        excluded.add(favorite.productId);
        if (favorite.product.categoryId) {
          categoryWeights.set(
            favorite.product.categoryId,
            (categoryWeights.get(favorite.product.categoryId) ?? 0) + 4,
          );
        }
        storeWeights.set(
          favorite.product.storeId,
          (storeWeights.get(favorite.product.storeId) ?? 0) + 2,
        );
      }

      for (const item of orderItems) {
        if (item.productId) excluded.add(item.productId);
        if (item.product?.categoryId) {
          categoryWeights.set(
            item.product.categoryId,
            (categoryWeights.get(item.product.categoryId) ?? 0) + 3,
          );
        }
        if (item.product?.storeId) {
          storeWeights.set(
            item.product.storeId,
            (storeWeights.get(item.product.storeId) ?? 0) + 1,
          );
        }
      }

      const categoryIds = Array.from(categoryWeights.keys());
      const storeIds = Array.from(storeWeights.keys());
      const hasTaste = categoryIds.length > 0 || storeIds.length > 0;

      const candidates = await this.db.client.product.findMany({
        where: {
          ...this.publicWhere,
          ...(excluded.size ? { id: { notIn: Array.from(excluded) } } : {}),
          ...(hasTaste ? {
            OR: [
              ...(categoryIds.length ? [{ categoryId: { in: categoryIds } }] : []),
              ...(storeIds.length ? [{ storeId: { in: storeIds } }] : []),
            ],
          } : {}),
        },
        include: {
          ...this.include,
          analytics: {
            where: {
              date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
            select: { views: true, cartAdds: true, favoriteAdds: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 60,
      });

      const ranked = candidates.map((product) => {
        const interest = product.analytics.reduce(
          (sum, row) => sum + row.views + row.cartAdds * 3 + row.favoriteAdds * 4,
          0,
        );
        const categoryScore = product.categoryId ? (categoryWeights.get(product.categoryId) ?? 0) : 0;
        const storeScore = storeWeights.get(product.storeId) ?? 0;
        return {
          product,
          score: categoryScore * 10 + storeScore * 5 + Math.min(interest, 50),
        };
      });

      return ranked
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(({ product }) => {
          const { analytics: _analytics, ...clean } = product;
          return this.normalizeProduct(clean);
        });
    });
  }
}

@SystemContext()
@Controller('recommendations')
class PublicRecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get('products/:productId/similar')
  similar(@Param('productId') productId: string) {
    return this.recommendations.similar(productId);
  }

  @Post('recent')
  recent(@Body() dto: RecentProductsDto) {
    return this.recommendations.recent(dto.ids);
  }
}

@UseGuards(JwtAuthGuard)
@SystemContext()
@Controller('recommendations')
class BuyerRecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get('personalized')
  personalized(@CurrentUser() user: AuthUser) {
    return this.recommendations.personalized(user.sub);
  }
}

@Module({
  controllers: [PublicRecommendationsController, BuyerRecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
