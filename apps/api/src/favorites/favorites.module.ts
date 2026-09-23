import { BadRequestException, Controller, Delete, Get, Injectable, Module, Param, Post, UseGuards } from '@nestjs/common';
import { ProductStatus, StoreStatus } from '@multiventas/db';
import { DbService } from '../common/db.service';
import { AuthUser, CurrentUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards';
import { StorageService } from '../storage/storage.module';

@Injectable()
class FavoritesService {
  constructor(private readonly db: DbService, private readonly storage: StorageService) {}

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

    await this.db.client.favorite.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
    return { favorite: true, productId };
  }

  async remove(userId: string, productId: string) {
    await this.db.client.favorite.deleteMany({ where: { userId, productId } });
    return { favorite: false, productId };
  }
}

@UseGuards(JwtAuthGuard)
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
  controllers: [FavoritesController],
  providers: [FavoritesService],
})
export class FavoritesModule {}
