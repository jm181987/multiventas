import { Body, Controller, Get, Injectable, Module, Param, Patch, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { DbService } from '../common/db.service';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { KycStatus, StoreStatus, UserRole, VendorStatus } from '@multiventas/db';

class UpdateVendorDto {
  @IsOptional() @IsString() businessName?: string;
  @IsOptional() @IsString() documentType?: string;
  @IsOptional() @IsString() documentNumber?: string;
}

class ReviewVendorDto {
  @IsIn([VendorStatus.APPROVED, VendorStatus.REJECTED, VendorStatus.SUSPENDED]) status!: VendorStatus;
  @IsOptional() @IsIn([KycStatus.VERIFIED, KycStatus.REJECTED, KycStatus.PENDING]) kycStatus?: KycStatus;
}

@Injectable()
class VendorsService {
  constructor(private readonly db: DbService) {}

  me(userId: string) {
    return this.db.client.vendor.findUnique({ where: { userId }, include: { stores: true } });
  }

  updateMe(id: string, dto: UpdateVendorDto) {
    return this.db.client.vendor.update({ where: { id }, data: dto });
  }

  list() {
    return this.db.client.vendor.findMany({
      include: { user: { select: { email: true, name: true } }, stores: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async review(id: string, dto: ReviewVendorDto) {
    const vendor = await this.db.client.vendor.update({
      where: { id },
      data: {
        status: dto.status,
        kycStatus: dto.kycStatus,
        approvedAt: dto.status === VendorStatus.APPROVED ? new Date() : undefined,
      },
    });

    if (dto.status === VendorStatus.APPROVED) {
      await this.db.client.store.updateMany({
        where: {
          tenantId: id,
          deletedAt: null,
          status: { in: [StoreStatus.DRAFT, StoreStatus.SUSPENDED] },
        },
        data: { status: StoreStatus.ACTIVE },
      });
    } else {
      await this.db.client.store.updateMany({
        where: { tenantId: id, deletedAt: null, status: StoreStatus.ACTIVE },
        data: { status: StoreStatus.SUSPENDED },
      });
    }

    return this.db.client.vendor.findUnique({ where: { id: vendor.id }, include: { stores: true } });
  }
}

@UseGuards(JwtAuthGuard)
@Controller('vendors')
class VendorsController {
  constructor(private readonly vendors: VendorsService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) { return this.vendors.me(user.sub); }

  @Patch('me')
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateVendorDto) {
    if (!user.tenantId) throw new Error('Tenant requerido');
    return this.vendors.updateMe(user.tenantId, dto);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Get()
  list() { return this.vendors.list(); }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id/review')
  review(@Param('id') id: string, @Body() dto: ReviewVendorDto) {
    return this.vendors.review(id, dto);
  }
}

@Module({ controllers: [VendorsController], providers: [VendorsService] })
export class VendorsModule {}
