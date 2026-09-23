import { BadRequestException, Controller, Delete, Get, Injectable, Module, Param, Post, UseGuards } from '@nestjs/common';
import { ProductStatus, StoreStatus } from '@multiventas/db';
import { DbService } from '../common/db.service';
import { AuthUser, CurrentUser, SystemContext } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards';
import { StorageService } from '../storage/storage.module';
import { AnalyticsModule, AnalyticsService } from '../analytics/analytics.module';

@Injectable()
class FavoritesService {
  constructor(
    private readonly db: DbService,
    private readonly storage: StorageService,
    private readonly analytics: AnalyticsService,
  ) {}

  private normalizeProduct(product: any) {
    return {
      ...product,
      store: product.store ? {
        ...product.store,
        logoUrl: product.store.logoUrl ? this.storage.normalizeMediaUrl(product.store.logoUrl) : null,
        coverUrl: product.store.coverUrl ? this.storage.normalizeMediaUrl(product.store.coverUrl) : null,
      } : product.store,
      images: (product.images ?? []).map((image: any) => ({
        ...image,
        url: this.storage.normalizeProductImageUrl(image.url),
      })),
    };
  }

  async list(userId: string) {
    const favorites = await this.db.client.favorite.findMany({
      where: {
        userId,
        product: {
          status: ProductStatus.ACTIVE,
          deletedAt: null,
          store: { status: StoreStatus.ACTIVE, deletedAt: null },
        },
      },
      include: {
        product: {
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            store: true,
            category: true,
            deliveryOptions: { where: { isActive: true }, orderBy: { type: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map((favorite) => ({
      id: favorite.id,
      createdAt: favorite.createdAt,
      product: this.normalizeProduct(favorite.product),
    }));
  }

  async ids(userId: string) {
    const favorites = await this.db.client.favorite.findMany({
      where: { userId },
      select: { productId: true },
      orderBy: { createdAt: 'desc' },
    });
    return favorites.map((favorite) => favorite.productId);
  }

  async add(userId: string, productId: string) {
    const product = await this.db.client.product.findFirst({
      where: {
        id: productId,
        status: ProductStatus.ACTIVE,
        deletedAt: null,
        store: { status: StoreStatus.ACTIVE, deletedAt: null },
      },
      select: { id: true },
    });
    if (!product) throw new BadRequestException('Producto no disponible');

    const existing = await this.db.client.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
      select: { id: true },
    });

    if (!existing) {
      await this.db.client.favorite.create({ data: { userId, productId } });
      await this.analytics.trackFavoriteAdd(productId).catch(() => undefined);
    }

    return { favorite: true, productId };
  }

  async remove(userId: string, productId: string) {
    await this.db.client.favorite.deleteMany({ where: { userId, productId } });
    return { favorite: false, productId };
  }
}

@UseGuards(JwtAuthGuard)
@SystemContext()
@Controller('favorites')
class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.favorites.list(user.sub);
  }

  @Get('ids')
  ids(@CurrentUser() user: AuthUser) {
    return this.favorites.ids(user.sub);
  }

  @Post(':productId')
  add(@CurrentUser() user: AuthUser, @Param('productId') productId: string) {
    return this.favorites.add(user.sub, productId);
  }

  @Delete(':productId')
  remove(@CurrentUser() user: AuthUser, @Param('productId') productId: string) {
    return this.favorites.remove(user.sub, productId);
  }
}

@Module({
  imports: [AnalyticsModule],
  controllers: [FavoritesController],
  providers: [FavoritesService],
})
export class FavoritesModule {}
