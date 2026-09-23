import { Body, Controller, Get, Injectable, Module, Param, Patch, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { DbService } from '../common/db.service';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import {
  CommissionStatus,
  KycStatus,
  OAuthProvider,
  OrderStatus,
  ProductStatus,
  StoreStatus,
  UserRole,
  VendorStatus,
} from '@multiventas/db';

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

  async dashboard(tenantId: string) {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const chartStart = new Date(startOfToday);
    chartStart.setDate(chartStart.getDate() - 13);

    const paidStatuses = [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED];

    const [
      vendor,
      mp,
      totalProducts,
      activeProducts,
      lowStock,
      outOfStock,
      paidOrders,
      todaySales,
      monthSales,
      pendingFulfillment,
      monthCommission,
      chartOrders,
      topProducts,
      recentOrders,
    ] = await Promise.all([
      this.db.client.vendor.findUnique({
        where: { id: tenantId },
        include: { stores: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } } },
      }),
      this.db.client.oAuthToken.findUnique({
        where: { tenantId_provider: { tenantId, provider: OAuthProvider.MERCADO_PAGO } },
        select: { expiresAt: true },
      }),
      this.db.client.product.count({ where: { tenantId, deletedAt: null } }),
      this.db.client.product.count({ where: { tenantId, deletedAt: null, status: ProductStatus.ACTIVE } }),
      this.db.client.product.count({ where: { tenantId, deletedAt: null, status: ProductStatus.ACTIVE, stock: { gt: 0, lte: 5 } } }),
      this.db.client.product.count({ where: { tenantId, deletedAt: null, status: ProductStatus.ACTIVE, stock: 0 } }),
      this.db.client.order.aggregate({
        where: { tenantId, status: { in: paidStatuses } },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.db.client.order.aggregate({
        where: { tenantId, status: { in: paidStatuses }, createdAt: { gte: startOfToday } },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.db.client.order.aggregate({
        where: { tenantId, status: { in: paidStatuses }, createdAt: { gte: startOfMonth } },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.db.client.order.count({ where: { tenantId, status: OrderStatus.PAID } }),
      this.db.client.commission.aggregate({
        where: { tenantId, status: CommissionStatus.CONFIRMED, createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.db.client.order.findMany({
        where: { tenantId, status: { in: paidStatuses }, createdAt: { gte: chartStart } },
        select: { createdAt: true, total: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.db.client.orderItem.groupBy({
        by: ['productId', 'title'],
        where: { tenantId, order: { status: { in: paidStatuses } } },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      this.db.client.order.findMany({
        where: { tenantId },
        select: {
          id: true,
          status: true,
          total: true,
          currency: true,
          createdAt: true,
          store: { select: { name: true } },
          buyer: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    if (!vendor) return null;

    const primaryStore = vendor.stores[0] ?? null;
    const brandingComplete = Boolean(
      primaryStore?.name
      && primaryStore?.description
      && primaryStore?.primaryColor
      && (primaryStore?.logoUrl || primaryStore?.coverUrl),
    );
    const mpConnected = Boolean(mp && mp.expiresAt.getTime() > now.getTime());
    const onboarding = [
      {
        key: 'approval',
        title: 'Cuenta aprobada',
        description: 'Tu cuenta debe estar aprobada para publicar y vender.',
        complete: vendor.status === VendorStatus.APPROVED,
        href: '/vendor',
      },
      {
        key: 'branding',
        title: 'Personalizá tu tienda',
        description: 'Completá descripción, color y al menos logo o portada.',
        complete: brandingComplete,
        href: '/vendor/configuracion',
      },
      {
        key: 'payments',
        title: 'Conectá Mercado Pago',
        description: 'Vinculá tu cuenta para poder cobrar tus ventas.',
        complete: mpConnected,
        href: '/vendor/mercadopago',
      },
      {
        key: 'product',
        title: 'Creá tu primer producto',
        description: 'Agregá precio, stock, descripción e imagen.',
        complete: totalProducts > 0,
        href: '/vendor/productos',
      },
      {
        key: 'publish',
        title: 'Publicá tu primer producto',
        description: 'Activá un producto para que aparezca en el marketplace.',
        complete: activeProducts > 0,
        href: '/vendor/productos',
      },
    ];
    const completeSteps = onboarding.filter((item) => item.complete).length;

    const dayMap = new Map<string, number>();
    for (let index = 0; index < 14; index += 1) {
      const date = new Date(chartStart);
      date.setDate(chartStart.getDate() + index);
      dayMap.set(date.toISOString().slice(0, 10), 0);
    }
    for (const order of chartOrders) {
      const key = order.createdAt.toISOString().slice(0, 10);
      dayMap.set(key, (dayMap.get(key) ?? 0) + Number(order.total));
    }

    const monthRevenue = Number(monthSales._sum.total ?? 0);
    const monthOrders = monthSales._count.id;

    return {
      vendor: {
        status: vendor.status,
        kycStatus: vendor.kycStatus,
        businessName: vendor.businessName,
      },
      onboarding: {
        steps: onboarding,
        completeSteps,
        totalSteps: onboarding.length,
        percent: Math.round((completeSteps / onboarding.length) * 100),
        complete: completeSteps === onboarding.length,
      },
      metrics: {
        revenueTotal: Number(paidOrders._sum.total ?? 0),
        revenueToday: Number(todaySales._sum.total ?? 0),
        revenueMonth: monthRevenue,
        ordersToday: todaySales._count.id,
        ordersMonth: monthOrders,
        averageTicketMonth: monthOrders ? monthRevenue / monthOrders : 0,
        pendingFulfillment,
        products: totalProducts,
        activeProducts,
        lowStock,
        outOfStock,
        commissionMonth: Number(monthCommission._sum.amount ?? 0),
      },
      salesChart: Array.from(dayMap.entries()).map(([date, total]) => ({ date, total })),
      topProducts: topProducts.map((item) => ({
        productId: item.productId,
        title: item.title,
        quantity: item._sum.quantity ?? 0,
        revenue: Number(item._sum.total ?? 0),
      })),
      recentOrders: recentOrders.map((order) => ({
        ...order,
        total: Number(order.total),
      })),
    };
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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Controller('vendor/dashboard')
class VendorDashboardController {
  constructor(private readonly vendors: VendorsService) {}

  @Get()
  dashboard(@CurrentUser() user: AuthUser) {
    return this.vendors.dashboard(user.tenantId!);
  }
}

@Module({
  controllers: [VendorsController, VendorDashboardController],
  providers: [VendorsService],
})
export class VendorsModule {}
