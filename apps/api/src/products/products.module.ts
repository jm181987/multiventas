import { BadRequestException, Body, Controller, Get, Injectable, Module, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';
import { DbService } from '../common/db.service';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { ProductStatus, UserRole } from '@multiventas/db';
import { StorageService } from '../storage/storage.module';

class ProductQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() store?: string;
  @IsOptional() @Type(() => Number) @IsNumber() minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 24;
}

class ProductDto {
  @IsString() storeId!: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() sku?: string;
  @IsString() slug!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @Type(() => Number) @IsNumber() @IsPositive() price!: number;
  @IsOptional() @IsString() currency = 'UYU';
  @Type(() => Number) @IsInt() @Min(0) stock!: number;
}

class ProductUpdateDto {
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() price?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) stock?: number;
  @IsOptional() @IsIn([ProductStatus.DRAFT, ProductStatus.ACTIVE, ProductStatus.ARCHIVED]) status?: ProductStatus;
}

class ImageDto {
  @IsString() url!: string;
  @IsOptional() @IsString() alt?: string;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder = 0;
}

@Injectable()
class ProductsService {
  constructor(private readonly db: DbService, private readonly storage: StorageService) {}

  async search(query: ProductQueryDto) {
    const where: any = {
      status: ProductStatus.ACTIVE,
      deletedAt: null,
      ...(query.q ? { OR: [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ] } : {}),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.store ? { store: { slug: query.store } } : {}),
      ...((query.minPrice ?? query.maxPrice) ? {
        price: {
          ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
          ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
        },
      } : {}),
    };
    const [items, total] = await Promise.all([
      this.db.client.product.findMany({
        where,
        include: { images: { orderBy: { sortOrder: 'asc' } }, store: true, category: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.client.product.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  byId(id: string) {
    return this.db.client.product.findFirst({
      where: { id, status: ProductStatus.ACTIVE, deletedAt: null },
      include: { images: { orderBy: { sortOrder: 'asc' } }, store: true, category: true, reviews: { where: { status: 'PUBLISHED' }, take: 20 } },
    });
  }

  mine() {
    return this.db.client.product.findMany({
      where: { deletedAt: null },
      include: { images: true, store: true, category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, dto: ProductDto) {
    const store = await this.db.client.store.findFirst({ where: { id: dto.storeId, tenantId, deletedAt: null } });
    if (!store) throw new BadRequestException('Tienda inválida');
    return this.db.client.product.create({
      data: { tenantId, ...dto, status: ProductStatus.DRAFT },
    });
  }

  update(id: string, dto: ProductUpdateDto) {
    return this.db.client.product.update({ where: { id }, data: dto });
  }

  softDelete(id: string) {
    return this.db.client.product.update({ where: { id }, data: { deletedAt: new Date(), status: ProductStatus.ARCHIVED } });
  }

  addImage(tenantId: string, productId: string, dto: ImageDto) {
    return this.db.client.productImage.create({ data: { tenantId, productId, ...dto } });
  }

  uploadUrl(tenantId: string, productId: string, filename: string, contentType: string) {
    return this.storage.createProductUploadUrl(tenantId, productId, filename, contentType);
  }
}

@Controller('products')
class PublicProductsController {
  constructor(private readonly products: ProductsService) {}
  @Get()
  search(@Query() query: ProductQueryDto) { return this.products.search(query); }
  @Get(':id')
  byId(@Param('id') id: string) { return this.products.byId(id); }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Controller('vendor/products')
class VendorProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  mine() { return this.products.mine(); }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: ProductDto) {
    return this.products.create(user.tenantId!, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: ProductUpdateDto) {
    return this.products.update(id, dto);
  }

  @Post(':id/images')
  image(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ImageDto) {
    return this.products.addImage(user.tenantId!, id, dto);
  }

  @Get(':id/upload-url')
  uploadUrl(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('filename') filename: string,
    @Query('contentType') contentType = 'image/jpeg',
  ) {
    return this.products.uploadUrl(user.tenantId!, id, filename, contentType);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string) { return this.products.softDelete(id); }
}

@Module({
  controllers: [PublicProductsController, VendorProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
