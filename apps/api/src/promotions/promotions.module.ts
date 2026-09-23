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
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { OrderStatus, PromotionType, UserRole } from '@multiventas/db';
import { DbService } from '../common/db.service';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';

class CreatePromotionDto {
  @IsString() storeId!: string;
  @IsString() name!: string;
  @IsString() code!: string;
  @IsIn([PromotionType.PERCENT, PromotionType.FIXED]) type!: PromotionType;
  @Type(() => Number) @IsNumber() @IsPositive() value!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minOrderAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() maxDiscountAmount?: number;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxUses?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class UpdatePromotionDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsIn([PromotionType.PERCENT, PromotionType.FIXED]) type?: PromotionType;
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() value?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minOrderAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() maxDiscountAmount?: number | null;
  @IsOptional() @IsDateString() startsAt?: string | null;
  @IsOptional() @IsDateString() endsAt?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxUses?: number | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Injectable()
export class PromotionsService {
  constructor(private readonly db: DbService) {}

  private normalizeCode(value: string) {
    return value.trim().toUpperCase().replace(/\s+/g, '');
  }

  private async ensureStore(tenantId: string, storeId: string) {
    const store = await this.db.client.store.findFirst({
      where: { id: storeId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!store) throw new BadRequestException('Tienda inválida');
  }

  private validateValues(type: PromotionType, value: number, startsAt?: Date | null, endsAt?: Date | null) {
    if (type === PromotionType.PERCENT && value > 100) {
      throw new BadRequestException('El descuento porcentual no puede superar 100%');
    }
    if (startsAt && endsAt && endsAt <= startsAt) {
      throw new BadRequestException('La fecha de fin debe ser posterior al inicio');
    }
  }

  async list(tenantId: string) {
    const promotions = await this.db.client.promotion.findMany({
      where: { tenantId },
      include: { store: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const paidStatuses = [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED];
    return Promise.all(promotions.map(async (promotion) => ({
      ...promotion,
      value: Number(promotion.value),
      minOrderAmount: Number(promotion.minOrderAmount),
      maxDiscountAmount: promotion.maxDiscountAmount === null ? null : Number(promotion.maxDiscountAmount),
      uses: await this.db.client.order.count({
        where: { promotionId: promotion.id, status: { in: paidStatuses } },
      }),
    })));
  }

  async create(tenantId: string, dto: CreatePromotionDto) {
    await this.ensureStore(tenantId, dto.storeId);
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    this.validateValues(dto.type, dto.value, startsAt, endsAt);

    try {
      return await this.db.client.promotion.create({
        data: {
          tenantId,
          storeId: dto.storeId,
          name: dto.name.trim(),
          code: this.normalizeCode(dto.code),
          type: dto.type,
          value: dto.value,
          minOrderAmount: dto.minOrderAmount ?? 0,
          maxDiscountAmount: dto.maxDiscountAmount,
          startsAt,
          endsAt,
          maxUses: dto.maxUses,
          isActive: dto.isActive ?? true,
        },
        include: { store: { select: { id: true, name: true, slug: true } } },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new BadRequestException('Ese código ya existe en esta tienda');
      throw error;
    }
  }

  async update(tenantId: string, id: string, dto: UpdatePromotionDto) {
    const current = await this.db.client.promotion.findFirst({ where: { id, tenantId } });
    if (!current) throw new BadRequestException('Promoción inválida');

    const type = dto.type ?? current.type;
    const value = dto.value ?? Number(current.value);
    const startsAt = dto.startsAt === undefined ? current.startsAt : (dto.startsAt ? new Date(dto.startsAt) : null);
    const endsAt = dto.endsAt === undefined ? current.endsAt : (dto.endsAt ? new Date(dto.endsAt) : null);
    this.validateValues(type, value, startsAt, endsAt);

    try {
      return await this.db.client.promotion.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          code: dto.code === undefined ? undefined : this.normalizeCode(dto.code),
          type: dto.type,
          value: dto.value,
          minOrderAmount: dto.minOrderAmount,
          maxDiscountAmount: dto.maxDiscountAmount,
          startsAt,
          endsAt,
          maxUses: dto.maxUses,
          isActive: dto.isActive,
        },
        include: { store: { select: { id: true, name: true, slug: true } } },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new BadRequestException('Ese código ya existe en esta tienda');
      throw error;
    }
  }

  async remove(tenantId: string, id: string) {
    const promotion = await this.db.client.promotion.findFirst({ where: { id, tenantId } });
    if (!promotion) throw new BadRequestException('Promoción inválida');
    const used = await this.db.client.order.count({ where: { promotionId: id } });
    if (used) {
      return this.db.client.promotion.update({ where: { id }, data: { isActive: false } });
    }
    return this.db.client.promotion.delete({ where: { id } });
  }

  async applicable(storeId: string, code: string, subtotal: number) {
    const normalized = this.normalizeCode(code);
    const now = new Date();
    const promotion = await this.db.client.promotion.findFirst({
      where: {
        storeId,
        code: normalized,
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
      },
    });
    if (!promotion) return null;
    if (subtotal < Number(promotion.minOrderAmount)) {
      throw new BadRequestException(`El cupón ${normalized} requiere una compra mínima de ${Number(promotion.minOrderAmount).toFixed(2)}`);
    }

    if (promotion.maxUses) {
      const uses = await this.db.client.order.count({
        where: {
          promotionId: promotion.id,
          status: { in: [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
        },
      });
      if (uses >= promotion.maxUses) throw new BadRequestException(`El cupón ${normalized} alcanzó su límite de usos`);
    }

    let discount = promotion.type === PromotionType.PERCENT
      ? subtotal * (Number(promotion.value) / 100)
      : Number(promotion.value);

    if (promotion.maxDiscountAmount !== null) {
      discount = Math.min(discount, Number(promotion.maxDiscountAmount));
    }

    const maxAllowed = Math.max(0, subtotal - 1);
    discount = Math.min(discount, maxAllowed);
    discount = Math.round(discount * 100) / 100;

    if (discount <= 0) throw new BadRequestException('El cupón no genera un descuento válido para esta compra');

    return { promotion, discount, code: normalized };
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Controller('vendor/promotions')
class VendorPromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.promotions.list(user.tenantId!);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePromotionDto) {
    return this.promotions.create(user.tenantId!, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotions.update(user.tenantId!, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.promotions.remove(user.tenantId!, id);
  }
}

@Module({
  controllers: [VendorPromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
