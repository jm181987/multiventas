import { BadRequestException, Body, Controller, Get, Injectable, Module, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { OrderStatus, ProductStatus, StoreStatus, UserRole } from '@multiventas/db';
import { DbService } from '../common/db.service';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';

class AnalyticsQueryDto {
  @Type(() => Number)
  @IsIn([7, 30, 90])
  days = 30;
}

class ProductViewDto {
  @IsOptional() @IsBoolean() countView = true;
  @IsOptional() @IsBoolean() shared = false;
}

type CounterField = 'views' | 'cartAdds' | 'favoriteAdds' | 'shares';

@Injectable()
export class AnalyticsService {
  constructor(private readonly db: DbService) {}

  private dateOnly(value = new Date()) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }

  private percentage(value: number, base: number) {
    return base > 0 ? Math.round((value / base) * 10_000) / 100 : 0;
  }

  private async record(productId: string, field: CounterField) {
    return this.db.runSystem(async () => {
      const product = await this.db.client.product.findFirst({
        where: {
          id: productId,
          status: ProductStatus.ACTIVE,
          deletedAt: null,
          store: { status: StoreStatus.ACTIVE, deletedAt: null },
        },
        select: { id: true, tenantId: true },
      });
      if (!product) throw new BadRequestException('Producto no disponible');

      const date = this.dateOnly();
      await this.db.client.productAnalyticsDaily.upsert({
        where: { productId_date: { productId: product.id, date } },
        create: {
          tenantId: product.tenantId,
          productId: product.id,
          date,
          [field]: 1,
        },
        update: {
          [field]: { increment: 1 },
        },
      });
      return { ok: true };
    });
  }

  async trackView(productId: string, dto: ProductViewDto) {
    return this.db.runSystem(async () => {
      const product = await this.db.client.product.findFirst({
        where: {
          id: productId,
          status: ProductStatus.ACTIVE,
          deletedAt: null,
          store: { status: StoreStatus.ACTIVE, deletedAt: null },
        },
        select: { id: true, tenantId: true },
      });
      if (!product) throw new BadRequestException('Producto no disponible');

      const date = this.dateOnly();
      const viewIncrement = dto.countView ? 1 : 0;
      const sharedIncrement = dto.shared ? 1 : 0;

      await this.db.client.productAnalyticsDaily.upsert({
        where: { productId_date: { productId: product.id, date } },
        create: {
          tenantId: product.tenantId,
          productId: product.id,
          date,
          views: viewIncrement,
          sharedVisits: sharedIncrement,
        },
        update: {
          ...(viewIncrement ? { views: { increment: viewIncrement } } : {}),
          ...(sharedIncrement ? { sharedVisits: { increment: sharedIncrement } } : {}),
        },
      });
      return { ok: true };
    });
  }

  trackShare(productId: string) {
    return this.record(productId, 'shares');
  }

  trackCartAdd(productId: string) {
    return this.record(productId, 'cartAdds');
  }

  trackFavoriteAdd(productId: string) {
    return this.record(productId, 'favoriteAdds');
  }

  async vendor(tenantId: string, days: number) {
    const now = this.dateOnly();
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    const paidStatuses = [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED];

    const [products, dailyRows, orderItems] = await Promise.all([
      this.db.client.product.findMany({
        where: { tenantId, deletedAt: null },
        select: {
          id: true,
          title: true,
          status: true,
          stock: true,
          createdAt: true,
          store: { select: { name: true } },
          images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.client.productAnalyticsDaily.findMany({
        where: { tenantId, date: { gte: start } },
        select: {
          productId: true,
          date: true,
          views: true,
          cartAdds: true,
          favoriteAdds: true,
          shares: true,
          sharedVisits: true,
        },
        orderBy: { date: 'asc' },
      }),
      this.db.client.orderItem.findMany({
        where: {
          tenantId,
          productId: { not: null },
          order: {
            status: { in: paidStatuses },
            createdAt: { gte: start },
          },
        },
        select: {
          productId: true,
          title: true,
          quantity: true,
          total: true,
          orderId: true,
          order: { select: { createdAt: true } },
        },
      }),
    ]);

    const productIds = products.map((product) => product.id);
    const currentFavoriteRows = productIds.length
      ? await this.db.runSystem(() => this.db.client.favorite.groupBy({
          by: ['productId'],
          where: { productId: { in: productIds } },
          _count: { productId: true },
        }))
      : [];

    const productMap = new Map(products.map((product) => [product.id, {
      productId: product.id,
      title: product.title,
      status: product.status,
      stock: product.stock,
      storeName: product.store.name,
      imageUrl: product.images[0]?.url ?? null,
      views: 0,
      cartAdds: 0,
      favoriteAdds: 0,
      shares: 0,
      sharedVisits: 0,
      currentFavorites: currentFavoriteRows.find((row) => row.productId === product.id)?._count.productId ?? 0,
      orderIds: new Set<string>(),
      soldUnits: 0,
      revenue: 0,
    }]));

    const trendMap = new Map<string, {
      date: string;
      views: number;
      cartAdds: number;
      favoriteAdds: number;
      shares: number;
      sharedVisits: number;
      orders: Set<string>;
      soldUnits: number;
      revenue: number;
    }>();

    for (let index = 0; index < days; index += 1) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      trendMap.set(key, {
        date: key,
        views: 0,
        cartAdds: 0,
        favoriteAdds: 0,
        shares: 0,
        sharedVisits: 0,
        orders: new Set<string>(),
        soldUnits: 0,
        revenue: 0,
      });
    }

    for (const row of dailyRows) {
      const item = productMap.get(row.productId);
      if (item) {
        item.views += row.views;
        item.cartAdds += row.cartAdds;
        item.favoriteAdds += row.favoriteAdds;
        item.shares += row.shares;
        item.sharedVisits += row.sharedVisits;
      }

      const key = row.date.toISOString().slice(0, 10);
      const trend = trendMap.get(key);
      if (trend) {
        trend.views += row.views;
        trend.cartAdds += row.cartAdds;
        trend.favoriteAdds += row.favoriteAdds;
        trend.shares += row.shares;
        trend.sharedVisits += row.sharedVisits;
      }
    }

    const globalOrderIds = new Set<string>();
    for (const row of orderItems) {
      if (!row.productId) continue;
      const item = productMap.get(row.productId);
      if (item) {
        item.orderIds.add(row.orderId);
        item.soldUnits += row.quantity;
        item.revenue += Number(row.total);
      }

      globalOrderIds.add(row.orderId);
      const key = row.order.createdAt.toISOString().slice(0, 10);
      const trend = trendMap.get(key);
      if (trend) {
        trend.orders.add(row.orderId);
        trend.soldUnits += row.quantity;
        trend.revenue += Number(row.total);
      }
    }

    const rows = Array.from(productMap.values()).map((item) => ({
      productId: item.productId,
      title: item.title,
      status: item.status,
      stock: item.stock,
      storeName: item.storeName,
      imageUrl: item.imageUrl,
      views: item.views,
      cartAdds: item.cartAdds,
      favoriteAdds: item.favoriteAdds,
      currentFavorites: item.currentFavorites,
      shares: item.shares,
      sharedVisits: item.sharedVisits,
      orders: item.orderIds.size,
      soldUnits: item.soldUnits,
      revenue: Math.round(item.revenue * 100) / 100,
      cartRate: this.percentage(item.cartAdds, item.views),
      favoriteRate: this.percentage(item.favoriteAdds, item.views),
      conversionRate: this.percentage(item.orderIds.size, item.views),
    }));

    const summary = rows.reduce((acc, item) => {
      acc.views += item.views;
      acc.cartAdds += item.cartAdds;
      acc.favoriteAdds += item.favoriteAdds;
      acc.currentFavorites += item.currentFavorites;
      acc.shares += item.shares;
      acc.sharedVisits += item.sharedVisits;
      acc.soldUnits += item.soldUnits;
      acc.revenue += item.revenue;
      return acc;
    }, {
      views: 0,
      cartAdds: 0,
      favoriteAdds: 0,
      currentFavorites: 0,
      shares: 0,
      sharedVisits: 0,
      soldUnits: 0,
      revenue: 0,
    });

    const trend = Array.from(trendMap.values()).map((point) => ({
      date: point.date,
      views: point.views,
      cartAdds: point.cartAdds,
      favoriteAdds: point.favoriteAdds,
      shares: point.shares,
      sharedVisits: point.sharedVisits,
      orders: point.orders.size,
      soldUnits: point.soldUnits,
      revenue: Math.round(point.revenue * 100) / 100,
    }));

    return {
      days,
      from: start.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
      summary: {
        ...summary,
        revenue: Math.round(summary.revenue * 100) / 100,
        orders: globalOrderIds.size,
        cartRate: this.percentage(summary.cartAdds, summary.views),
        favoriteRate: this.percentage(summary.favoriteAdds, summary.views),
        conversionRate: this.percentage(globalOrderIds.size, summary.views),
      },
      trend,
      products: rows.sort((a, b) => {
        if (b.views !== a.views) return b.views - a.views;
        if (b.revenue !== a.revenue) return b.revenue - a.revenue;
        return a.title.localeCompare(b.title);
      }),
    };
  }
}

@Controller('analytics')
class PublicAnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post('products/:productId/view')
  view(@Param('productId') productId: string, @Body() dto: ProductViewDto) {
    return this.analytics.trackView(productId, dto);
  }

  @Post('products/:productId/share')
  share(@Param('productId') productId: string) {
    return this.analytics.trackShare(productId);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Controller('vendor/analytics')
class VendorAnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  dashboard(@CurrentUser() user: AuthUser, @Query() query: AnalyticsQueryDto) {
    return this.analytics.vendor(user.tenantId!, query.days);
  }
}

@Module({
  controllers: [PublicAnalyticsController, VendorAnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
