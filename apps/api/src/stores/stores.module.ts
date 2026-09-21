import { BadRequestException, Body, Controller, Get, Injectable, Module, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsHexColor, IsIn, IsOptional, IsString } from 'class-validator';
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
  @IsOptional() @IsHexColor() primaryColor?: string;
}

class StoreUpdateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsString() logoUrl?: string | null;
  @IsOptional() @IsString() coverUrl?: string | null;
  @IsOptional() @IsHexColor() primaryColor?: string | null;
  @IsOptional() @IsIn([StoreStatus.DRAFT, StoreStatus.ACTIVE, StoreStatus.SUSPENDED]) status?: StoreStatus;
}

@Injectable()
class StoresService {
  constructor(private readonly db: DbService, private readonly storage: StorageService) {}

  private normalizeStore<T>(store: T): T {
    const value = store as any;
    if (!value) return store;
    const normalized: any = {
      ...value,
      logoUrl: value.logoUrl ? this.storage.normalizeMediaUrl(value.logoUrl) : null,
      coverUrl: value.coverUrl ? this.storage.normalizeMediaUrl(value.coverUrl) : null,
    };
    if (value.products) {
      normalized.products = value.products.map((product: any) => ({
        ...product,
        images: (product.images ?? []).map((image: any) => ({
          ...image,
          url: this.storage.normalizeProductImageUrl(image.url),
        })),
      }));
    }
    return normalized as T;
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

  async mine() {
    const stores = await this.db.client.store.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } });
    return stores.map((store) => this.normalizeStore(store));
  }

  create(tenantId: string, dto: StoreDto) {
    return this.db.client.store.create({ data: { tenantId, ...dto, status: StoreStatus.DRAFT } });
  }

  private async ownedStore(tenantId: string, id: string) {
    const store = await this.db.client.store.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!store) throw new BadRequestException('Tienda inválida');
    return store;
  }

  async update(tenantId: string, id: string, dto: StoreUpdateDto) {
    await this.ownedStore(tenantId, id);
    const store = await this.db.client.store.update({ where: { id }, data: dto });
    return this.normalizeStore(store);
  }

  async uploadAsset(tenantId: string, id: string, kind: 'logo' | 'cover', file: any) {
    await this.ownedStore(tenantId, id);
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');
    if (!String(file.mimetype ?? '').startsWith('image/')) throw new BadRequestException('El archivo debe ser una imagen');

    const uploaded = await this.storage.uploadStoreAsset(
      tenantId,
      id,
      kind,
      file.originalname ?? `${kind}.jpg`,
      file.mimetype,
      file.buffer,
    );

    const store = await this.db.client.store.update({
      where: { id },
      data: kind === 'logo' ? { logoUrl: uploaded.publicUrl } : { coverUrl: uploaded.publicUrl },
    });
    return this.normalizeStore(store);
  }

  async removeAsset(tenantId: string, id: string, kind: 'logo' | 'cover') {
    await this.ownedStore(tenantId, id);
    const store = await this.db.client.store.update({
      where: { id },
      data: kind === 'logo' ? { logoUrl: null } : { coverUrl: null },
    });
    return this.normalizeStore(store);
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
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: StoreUpdateDto) {
    return this.stores.update(user.tenantId!, id, dto);
  }

  @Patch(':id/logo')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadLogo(@CurrentUser() user: AuthUser, @Param('id') id: string, @UploadedFile() file: any) {
    return this.stores.uploadAsset(user.tenantId!, id, 'logo', file);
  }

  @Patch(':id/cover')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  uploadCover(@CurrentUser() user: AuthUser, @Param('id') id: string, @UploadedFile() file: any) {
    return this.stores.uploadAsset(user.tenantId!, id, 'cover', file);
  }

  @Post(':id/logo/remove')
  removeLogo(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.stores.removeAsset(user.tenantId!, id, 'logo');
  }

  @Post(':id/cover/remove')
  removeCover(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.stores.removeAsset(user.tenantId!, id, 'cover');
  }
}

@Module({
  controllers: [PublicStoresController, VendorStoresController],
  providers: [StoresService],
})
export class StoresModule {}
