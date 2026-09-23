import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { DbService } from '../common/db.service';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { DeliveryMethodType, Prisma, ProductStatus, StoreStatus, UserRole, VendorStatus } from '@multiventas/db';
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

class DeliveryOptionDto {
  @IsIn([
    DeliveryMethodType.SHIPPING_PAID,
    DeliveryMethodType.SHIPPING_FREE,
    DeliveryMethodType.PICKUP,
    DeliveryMethodType.DIGITAL,
  ])
  type!: DeliveryMethodType;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) fee?: number;
  @IsOptional() @IsString() @MaxLength(1200) details?: string;
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
  @IsOptional() @IsArray() @ArrayMaxSize(4) @ValidateNested({ each: true }) @Type(() => DeliveryOptionDto)
  deliveryOptions?: DeliveryOptionDto[];
}

class ProductUpdateDto {
  @IsOptional() @IsString() categoryId?: string | null;
  @IsOptional() @IsString() sku?: string | null;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() price?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) stock?: number;
  @IsOptional() @IsIn([ProductStatus.DRAFT, ProductStatus.ACTIVE, ProductStatus.ARCHIVED]) status?: ProductStatus;
  @IsOptional() @IsArray() @ArrayMaxSize(4) @ValidateNested({ each: true }) @Type(() => DeliveryOptionDto)
  deliveryOptions?: DeliveryOptionDto[];
}

class ImageDto {
  @IsString() url!: string;
  @IsOptional() @IsString() alt?: string;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder = 0;
}

@Injectable()
class ProductsService {
  constructor(private readonly db: DbService, private readonly storage: StorageService) {}

  private normalizeProduct<T>(product: T): T {
    const value = product as any;
    if (!value?.images) return product;
    return {
      ...value,
      store: value.store ? {
        ...value.store,
        logoUrl: value.store.logoUrl ? this.storage.normalizeMediaUrl(value.store.logoUrl) : null,
        coverUrl: value.store.coverUrl ? this.storage.normalizeMediaUrl(value.store.coverUrl) : null,
      } : value.store,
      images: value.images.map((image: any) => ({
        ...image,
        url: this.storage.normalizeProductImageUrl(image.url),
      })),
    } as T;
  }

  async search(query: ProductQueryDto) {
    const where: any = {
      status: ProductStatus.ACTIVE,
      deletedAt: null,
      store: { status: StoreStatus.ACTIVE, deletedAt: null },
      ...(query.q ? { OR: [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ] } : {}),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.store ? { store: { slug: query.store, status: StoreStatus.ACTIVE, deletedAt: null } } : {}),
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
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          store: true,
          category: true,
          deliveryOptions: { where: { isActive: true }, orderBy: { type: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.client.product.count({ where }),
    ]);

    return { items: items.map((item) => this.normalizeProduct(item)), total, page: query.page, limit: query.limit };
  }

  async byId(id: string) {
    const product = await this.db.client.product.findFirst({
      where: {
        id,
        status: ProductStatus.ACTIVE,
        deletedAt: null,
        store: { status: StoreStatus.ACTIVE, deletedAt: null },
      },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        store: true,
        category: true,
        reviews: { where: { status: 'PUBLISHED' }, take: 20 },
        deliveryOptions: { where: { isActive: true }, orderBy: { type: 'asc' } },
      },
    });
    return product ? this.normalizeProduct(product) : null;
  }

  async mine() {
    const items = await this.db.client.product.findMany({
      where: { deletedAt: null },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        store: true,
        category: true,
        deliveryOptions: { orderBy: { type: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item) => this.normalizeProduct(item));
  }

  private async ownedProduct(tenantId: string, productId: string) {
    const product = await this.db.client.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
    });
    if (!product) throw new BadRequestException('Producto inválido');
    return product;
  }

  private writeError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new BadRequestException('El slug o SKU ya está en uso en esta tienda');
    }
    throw error;
  }

  private normalizeDeliveryOptions(options?: DeliveryOptionDto[]) {
    if (options === undefined) return undefined;
    const seen = new Set<DeliveryMethodType>();
    return options.map((option) => {
      if (seen.has(option.type)) throw new BadRequestException('No repitas el mismo método de entrega');
      seen.add(option.type);
      const fee = option.type === DeliveryMethodType.SHIPPING_PAID ? Number(option.fee ?? 0) : 0;
      if (option.type === DeliveryMethodType.SHIPPING_PAID && fee <= 0) {
        throw new BadRequestException('El envío pago necesita un costo mayor a 0');
      }
      return {
        type: option.type,
        fee,
        details: option.details?.trim() || null,
      };
    });
  }

  private async replaceDeliveryOptions(
    tenantId: string,
    productId: string,
    options: DeliveryOptionDto[] | undefined,
  ) {
    if (options === undefined) return;
    const normalized = this.normalizeDeliveryOptions(options) ?? [];
    await this.db.client.productDeliveryOption.deleteMany({ where: { productId, tenantId } });
    if (normalized.length) {
      await this.db.client.productDeliveryOption.createMany({
        data: normalized.map((option) => ({ tenantId, productId, ...option })),
      });
    }
  }

  private async ensurePublishable(tenantId: string, storeId: string) {
    const vendor = await this.db.client.vendor.findFirst({
      where: { id: tenantId, deletedAt: null },
    });
    if (!vendor || vendor.status !== VendorStatus.APPROVED) {
      throw new BadRequestException('Tu cuenta de vendedor debe estar aprobada antes de publicar productos');
    }

    const store = await this.db.client.store.findFirst({
      where: { id: storeId, tenantId, deletedAt: null },
    });
    if (!store) throw new BadRequestException('Tienda inválida');
    if (store.status === StoreStatus.SUSPENDED) {
      throw new BadRequestException('La tienda está suspendida y no puede publicar productos');
    }
    if (store.status === StoreStatus.DRAFT) {
      await this.db.client.store.update({
        where: { id: store.id },
        data: { status: StoreStatus.ACTIVE },
      });
    }
  }

  async create(tenantId: string, dto: ProductDto) {
    const store = await this.db.client.store.findFirst({ where: { id: dto.storeId, tenantId, deletedAt: null } });
    if (!store) throw new BadRequestException('Tienda inválida');
    const { deliveryOptions, ...productData } = dto;
    this.normalizeDeliveryOptions(deliveryOptions);
    try {
      const product = await this.db.client.product.create({
        data: { tenantId, ...productData, status: ProductStatus.DRAFT },
      });
      await this.replaceDeliveryOptions(tenantId, product.id, deliveryOptions);
      const complete = await this.db.client.product.findUniqueOrThrow({
        where: { id: product.id },
        include: {
          images: true,
          store: true,
          category: true,
          deliveryOptions: { orderBy: { type: 'asc' } },
        },
      });
      return this.normalizeProduct(complete);
    } catch (error) {
      this.writeError(error);
    }
  }

  async update(tenantId: string, id: string, dto: ProductUpdateDto) {
    const product = await this.ownedProduct(tenantId, id);
    if (dto.status === ProductStatus.ACTIVE) {
      await this.ensurePublishable(tenantId, product.storeId);
    }

    const { deliveryOptions, ...productData } = dto;
    this.normalizeDeliveryOptions(deliveryOptions);
    try {
      await this.db.client.product.update({
        where: { id },
        data: productData,
      });
      await this.replaceDeliveryOptions(tenantId, id, deliveryOptions);
      const updated = await this.db.client.product.findUniqueOrThrow({
        where: { id },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          store: true,
          category: true,
          deliveryOptions: { orderBy: { type: 'asc' } },
        },
      });
      return this.normalizeProduct(updated);
    } catch (error) {
      this.writeError(error);
    }
  }

  async softDelete(tenantId: string, id: string) {
    await this.ownedProduct(tenantId, id);
    return this.db.client.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: ProductStatus.ARCHIVED },
    });
  }

  async addImage(tenantId: string, productId: string, dto: ImageDto) {
    await this.ownedProduct(tenantId, productId);
    return this.db.client.productImage.create({ data: { tenantId, productId, ...dto } });
  }

  async uploadImage(tenantId: string, productId: string, file: any, alt?: string) {
    await this.ownedProduct(tenantId, productId);
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');
    if (!String(file.mimetype ?? '').startsWith('image/')) throw new BadRequestException('El archivo debe ser una imagen');

    const uploaded = await this.storage.uploadProductImage(
      tenantId,
      productId,
      file.originalname ?? 'imagen',
      file.mimetype,
      file.buffer,
    );

    return this.db.client.productImage.create({
      data: { tenantId, productId, url: uploaded.publicUrl, alt: alt || undefined },
    });
  }

  async removeImage(tenantId: string, productId: string, imageId: string) {
    await this.ownedProduct(tenantId, productId);
    const image = await this.db.client.productImage.findFirst({ where: { id: imageId, productId, tenantId } });
    if (!image) throw new BadRequestException('Imagen inválida');
    return this.db.client.productImage.delete({ where: { id: imageId } });
  }

  async uploadUrl(tenantId: string, productId: string, filename: string, contentType: string) {
    await this.ownedProduct(tenantId, productId);
    return this.storage.createProductUploadUrl(tenantId, productId, filename, contentType);
  }
}

@Controller('products')
class PublicProductsController {
  constructor(private readonly products: ProductsService) {}
  @Get() search(@Query() query: ProductQueryDto) { return this.products.search(query); }
  @Get(':id') byId(@Param('id') id: string) { return this.products.byId(id); }
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
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ProductUpdateDto) {
    return this.products.update(user.tenantId!, id, dto);
  }

  @Post(':id/images')
  image(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ImageDto) {
    return this.products.addImage(user.tenantId!, id, dto);
  }

  @Post(':id/images/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadImage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Body('alt') alt?: string,
  ) {
    return this.products.uploadImage(user.tenantId!, id, file, alt);
  }

  @Delete(':id/images/:imageId')
  removeImage(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('imageId') imageId: string) {
    return this.products.removeImage(user.tenantId!, id, imageId);
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
  archive(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.products.softDelete(user.tenantId!, id);
  }
}

@Module({
  controllers: [PublicProductsController, VendorProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
