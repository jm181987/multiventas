import { Body, Controller, Get, Injectable, Module, Patch, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsEmail, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { DbService } from '../common/db.service';
import { Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { ProductStatus, StoreStatus, UserRole, VendorStatus } from '@multiventas/db';
import { PaymentsModule } from '../payments/payments.module';
import { MercadoPagoService } from '../payments/mercado-pago.service';

class MercadoPagoMarketplaceConfigDto {
  @IsOptional() @IsEmail() accountEmail?: string;
  @IsOptional() @IsString() clientId?: string;
  @IsOptional() @IsString() clientSecret?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1) feeRate?: number;
}

@Injectable()
class AdminService {
  constructor(
    private readonly db: DbService,
    private readonly mp: MercadoPagoService,
  ) {}

  async dashboard() {
    const [
      users,
      vendors,
      pendingVendors,
      approvedVendors,
      stores,
      activeStores,
      products,
      activeProducts,
      orders,
      gross,
      commissions,
      recentVendors,
    ] = await Promise.all([
      this.db.client.user.count({ where: { deletedAt: null } }),
      this.db.client.vendor.count({ where: { deletedAt: null } }),
      this.db.client.vendor.count({ where: { deletedAt: null, status: VendorStatus.PENDING } }),
      this.db.client.vendor.count({ where: { deletedAt: null, status: VendorStatus.APPROVED } }),
      this.db.client.store.count({ where: { deletedAt: null } }),
      this.db.client.store.count({ where: { deletedAt: null, status: StoreStatus.ACTIVE } }),
      this.db.client.product.count({ where: { deletedAt: null } }),
      this.db.client.product.count({ where: { deletedAt: null, status: ProductStatus.ACTIVE } }),
      this.db.client.order.count(),
      this.db.client.order.aggregate({ _sum: { total: true } }),
      this.db.client.commission.aggregate({ _sum: { amount: true } }),
      this.db.client.vendor.findMany({
        where: { deletedAt: null },
        include: {
          user: { select: { id: true, email: true, name: true, avatarUrl: true } },
          stores: { select: { id: true, name: true, slug: true, status: true }, take: 3 },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
    ]);

    return {
      users,
      vendors,
      pendingVendors,
      approvedVendors,
      stores,
      activeStores,
      products,
      activeProducts,
      orders,
      grossSales: gross._sum.total ?? 0,
      platformCommissions: commissions._sum.amount ?? 0,
      recentVendors,
    };
  }

  transactions() {
    return this.db.client.payment.findMany({
      include: {
        order: {
          include: {
            store: true,
            buyer: { select: { id: true, name: true, email: true } },
          },
        },
        commission: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  commissions() {
    return this.db.client.commission.findMany({
      include: {
        vendor: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        order: {
          include: {
            store: { select: { id: true, name: true, slug: true } },
            buyer: { select: { id: true, name: true, email: true } },
          },
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  mercadoPagoConfig() {
    return this.mp.getMarketplaceAdminConfig();
  }

  updateMercadoPagoConfig(dto: MercadoPagoMarketplaceConfigDto) {
    return this.mp.updateMarketplaceAdminConfig(dto);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  dashboard() { return this.admin.dashboard(); }

  @Get('transactions')
  transactions() { return this.admin.transactions(); }

  @Get('commissions')
  commissions() { return this.admin.commissions(); }

  @Get('mercadopago')
  mercadoPagoConfig() { return this.admin.mercadoPagoConfig(); }

  @Patch('mercadopago')
  updateMercadoPagoConfig(@Body() dto: MercadoPagoMarketplaceConfigDto) {
    return this.admin.updateMercadoPagoConfig(dto);
  }
}

@Module({
  imports: [PaymentsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
