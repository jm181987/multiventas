import { Body, Controller, Get, Injectable, Module, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { DbService } from '../common/db.service';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { StoreStatus, UserRole } from '@multiventas/db';
import { StorageService } from '../storage/storage.module';

class StoreDto {
  @IsString() name!: string;
  @IsString() slug!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() coverUrl?: string;
  @IsOptional() @IsString() primaryColor?: string;
}

class StoreUpdateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() coverUrl?: string;
  @IsOptional() @IsString() primaryColor?: string;
  @IsOptional() @IsIn([StoreStatus.DRAFT, StoreStatus.ACTIVE, StoreStatus.SUSPENDED]) status?: StoreStatus;
}

@Injectable()
class StoresService {
  constructor(private readonly db: DbService, private readonly storage: StorageService) {}

  private normalizeStore<T>(store: T): T {
    const value = store as any;
    if (!value?.products) return store;
    return {
      ...value,
      products: value.products.map((product: any) => ({
        ...product,
        images: (product.images ?? []).map((image: any) => ({
          ...image,
          url: this.storage.normalizeProductImageUrl(image.url),
        })),
      })),
    } as T;
  }

  async publicBySlug(slug: string) {
    const store = await this.db.client.store.findFirst({
      where: { slug, status: StoreStatus.ACTIVE, deletedAt: null },
      include: {
        products: {
          where: { status: 'ACTIVE', deletedAt: null },
          include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
          take: 24,
        },
      },
    });
    return store ? this.normalizeStore(store) : null;
  }

  mine() {
    return this.db.client.store.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  create(tenantId: string, dto: StoreDto) {
    return this.db.client.store.create({ data: { tenantId, ...dto, status: StoreStatus.DRAFT } });
  }

  update(id: string, dto: StoreUpdateDto) {
    return this.db.client.store.update({ where: { id }, data: dto });
  }
}

@Controller('stores')
class PublicStoresController {
  constructor(private readonly stores: StoresService) {}
  @Get(':slug')
  bySlug(@Param('slug') slug: string) { return this.stores.publicBySlug(slug); }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Controller('vendor/stores')
class VendorStoresController {
  constructor(private readonly stores: StoresService) {}

  @Get()
  mine() { return this.stores.mine(); }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: StoreDto) {
    return this.stores.create(user.tenantId!, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: StoreUpdateDto) {
    return this.stores.update(id, dto);
  }
}

@Module({
  controllers: [PublicStoresController, VendorStoresController],
  providers: [StoresService],
})
export class StoresModule {}
