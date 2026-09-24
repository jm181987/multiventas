import { Body, Controller, Get, Injectable, Module, Patch, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsEmail, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { DbService } from '../common/db.service';
import { Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { OrderStatus, ProductStatus, StoreStatus, UserRole, VendorStatus } from '@multiventas/db';
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
      commercialProducts,
      productsWithoutImages,
      productsWithoutCategory,
      outOfStockProducts,
      storesWithoutMercadoPago,
      stalePendingOrders,
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
      this.db.client.product.findMany({
        where: { deletedAt: null, status: ProductStatus.ACTIVE, stock: { gt: 0 } },
        select: {
          id: true,
          title: true,
          stock: true,
          store: { select: { name: true } },
          analytics: {
            where: { date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
            select: { views: true, cartAdds: true, favoriteAdds: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 150,
      }),
      this.db.client.product.count({ where: { deletedAt: null, status: ProductStatus.ACTIVE, images: { none: {} } } }),
      this.db.client.product.count({ where: { deletedAt: null, status: ProductStatus.ACTIVE, categoryId: null } }),
      this.db.client.product.count({ where: { deletedAt: null, status: ProductStatus.ACTIVE, stock: 0 } }),
      this.db.client.store.count({
        where: {
          deletedAt: null,
          status: StoreStatus.ACTIVE,
          vendor: { oauthTokens: { none: { provider: 'MERCADO_PAGO' } } },
        },
      }),
      this.db.client.order.count({
        where: {
          status: OrderStatus.PENDING,
          createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const commercialSales = commercialProducts.length
      ? await this.db.client.orderItem.findMany({
          where: {
            productId: { in: commercialProducts.map((product) => product.id) },
            order: {
              status: { in: [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
              createdAt: { gte: since },
            },
          },
          select: { productId: true, orderId: true, quantity: true },
        })
      : [];
    const salesByProduct = new Map<string, { orders: Set<string>; units: number }>();
    for (const sale of commercialSales) {
      if (!sale.productId) continue;
      const current = salesByProduct.get(sale.productId) ?? { orders: new Set<string>(), units: 0 };
      current.orders.add(sale.orderId);
      current.units += sale.quantity;
      salesByProduct.set(sale.productId, current);
    }
    const commercialOpportunities = commercialProducts
      .map((product) => {
        const activity = product.analytics.reduce(
          (sum, row) => ({
            views: sum.views + row.views,
            cartAdds: sum.cartAdds + row.cartAdds,
            favoriteAdds: sum.favoriteAdds + row.favoriteAdds,
          }),
          { views: 0, cartAdds: 0, favoriteAdds: 0 },
        );
        const sold = salesByProduct.get(product.id) ?? { orders: new Set<string>(), units: 0 };
        const conversionRate = activity.views > 0 ? Math.round((sold.orders.size / activity.views) * 10000) / 100 : 0;
        const opportunityScore = activity.views + activity.cartAdds * 5 + activity.favoriteAdds * 3 - sold.orders.size * 15;
        return {
          id: product.id,
          title: product.title,
          storeName: product.store.name,
          stock: product.stock,
          views: activity.views,
          cartAdds: activity.cartAdds,
          favoriteAdds: activity.favoriteAdds,
          orders: sold.orders.size,
          soldUnits: sold.units,
          conversionRate,
          opportunityScore,
        };
      })
      .filter((product) => product.views >= 5 && (product.orders === 0 || product.conversionRate < 2))
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, 8);

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
      commercialOpportunities,
      marketplaceHealth: {
        productsWithoutImages,
        productsWithoutCategory,
        outOfStockProducts,
        storesWithoutMercadoPago,
        stalePendingOrders,
        totalIssues: productsWithoutImages + productsWithoutCategory + outOfStockProducts + storesWithoutMercadoPago + stalePendingOrders,
      },
    };
  }

  orders() {
    return this.db.client.order.findMany({
      include: {
        store: { select: { id: true, slug: true, name: true, logoUrl: true, primaryColor: true } },
        buyer: { select: { id: true, name: true, email: true } },
        payment: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
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

  @Get('orders')
  orders() { return this.admin.orders(); }

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
