import { BadRequestException, Body, Controller, Get, Injectable, Module, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { DbService } from '../common/db.service';
import { CartModule, CartService } from '../cart/cart.module';
import { PaymentsModule } from '../payments/payments.module';
import { MercadoPagoService } from '../payments/mercado-pago.service';
import { AuthUser, CurrentUser, Roles, SystemContext } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { OrderStatus, ProductStatus, UserRole } from '@multiventas/db';
import { StorageService } from '../storage/storage.module';

class CheckoutDto {
  @IsOptional() @IsObject() shippingAddress?: Record<string, unknown>;
  @IsOptional() @IsString() notes?: string;
}

class OrderStatusDto {
  @IsIn([OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED]) status!: OrderStatus;
}

@Injectable()
class OrdersService {
  constructor(
    private readonly db: DbService,
    private readonly cart: CartService,
    private readonly mp: MercadoPagoService,
    private readonly storage: StorageService,
  ) {}

  private normalizeOrder<T>(order: T): T {
    const value = order as any;
    if (!value) return order;
    return {
      ...value,
      store: value.store ? {
        ...value.store,
        logoUrl: value.store.logoUrl ? this.storage.normalizeMediaUrl(value.store.logoUrl) : null,
        coverUrl: value.store.coverUrl ? this.storage.normalizeMediaUrl(value.store.coverUrl) : null,
      } : value.store,
      items: (value.items ?? []).map((item: any) => ({
        ...item,
        product: item.product ? {
          ...item.product,
          images: (item.product.images ?? []).map((image: any) => ({
            ...image,
            url: this.storage.normalizeProductImageUrl(image.url),
          })),
        } : null,
      })),
    } as T;
  }

  async checkout(userId: string, dto: CheckoutDto) {
    const cart = await this.cart.get(userId);
    if (!cart.length) throw new BadRequestException('El carrito está vacío');

    const products = await this.db.client.product.findMany({
      where: { id: { in: cart.map((x) => x.productId) }, status: ProductStatus.ACTIVE, deletedAt: null },
      include: { store: true },
    });
    if (products.length !== cart.length) throw new BadRequestException('Hay productos no disponibles');

    const grouped = new Map<string, { storeId: string; tenantId: string; rows: Array<{ product: any; quantity: number }> }>();
    for (const item of cart) {
      const product = products.find((p) => p.id === item.productId)!;
      if (product.stock < item.quantity) throw new BadRequestException(`Stock insuficiente para ${product.title}`);
      const key = product.storeId;
      const group = grouped.get(key) ?? { storeId: product.storeId, tenantId: product.tenantId, rows: [] };
      group.rows.push({ product, quantity: item.quantity });
      grouped.set(key, group);
    }

    const checkouts = [];
    for (const group of grouped.values()) {
      const subtotal = Math.round(group.rows.reduce((sum, row) => sum + Number(row.product.price) * row.quantity, 0) * 100) / 100;
      const order = await this.db.client.order.create({
        data: {
          tenantId: group.tenantId,
          storeId: group.storeId,
          buyerId: userId,
          subtotal,
          total: subtotal,
          shippingAddress: dto.shippingAddress as any,
          notes: dto.notes,
          items: {
            create: group.rows.map(({ product, quantity }) => ({
              tenantId: group.tenantId,
              productId: product.id,
              title: product.title,
              sku: product.sku,
              quantity,
              unitPrice: product.price,
              total: Number(product.price) * quantity,
            })),
          },
        },
      });

      for (const { product, quantity } of group.rows) {
        const updated = await this.db.client.product.updateMany({
          where: { id: product.id, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (updated.count !== 1) throw new BadRequestException(`Stock modificado para ${product.title}`);
      }

      const preference = await this.mp.createPreference(order.id);
      checkouts.push({
        orderId: order.id,
        preferenceId: preference.id,
        initPoint: preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point,
        marketplaceFee: preference.marketplaceFee,
      });
    }

    await this.cart.clear(userId);
    return { checkouts };
  }

  async buyerOrders(userId: string) {
    const orders = await this.db.client.order.findMany({
      where: { buyerId: userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
              },
            },
          },
        },
        payment: true,
        store: {
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            logoUrl: true,
            coverUrl: true,
            primaryColor: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((order) => this.normalizeOrder(order));
  }

  async vendorOrders(tenantId: string) {
    const orders = await this.db.client.order.findMany({
      where: { tenantId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
              },
            },
          },
        },
        payment: true,
        store: {
          select: {
            id: true,
            slug: true,
            name: true,
            logoUrl: true,
            primaryColor: true,
          },
        },
        buyer: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((order) => this.normalizeOrder(order));
  }

  private assertTransition(current: OrderStatus, next: OrderStatus) {
    const allowed: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.PENDING]: [OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [OrderStatus.SHIPPED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
    };
    if (!(allowed[current] ?? []).includes(next)) {
      throw new BadRequestException(`No se puede cambiar un pedido de ${current} a ${next}`);
    }
  }

  private async restoreStock(items: Array<{ productId: string | null; quantity: number }>) {
    for (const item of items) {
      if (!item.productId) continue;
      await this.db.client.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
  }

  async updateVendorStatus(tenantId: string, id: string, status: OrderStatus) {
    const order = await this.db.client.order.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });
    if (!order) throw new BadRequestException('Pedido inválido');

    this.assertTransition(order.status, status);

    if (status === OrderStatus.CANCELLED && order.status === OrderStatus.PENDING) {
      await this.restoreStock(order.items);
    }

    const updated = await this.db.client.order.update({
      where: { id },
      data: { status },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
              },
            },
          },
        },
        payment: true,
        store: { select: { id: true, slug: true, name: true, logoUrl: true, primaryColor: true } },
        buyer: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
      },
    });
    return this.normalizeOrder(updated);
  }

  async cancelBuyerOrder(userId: string, id: string) {
    const order = await this.db.client.order.findFirst({
      where: { id, buyerId: userId },
      include: { items: true },
    });
    if (!order) throw new BadRequestException('Pedido inválido');
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Solo puedes cancelar un pedido pendiente de pago');
    }

    await this.restoreStock(order.items);

    const updated = await this.db.client.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
              },
            },
          },
        },
        payment: true,
        store: {
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            logoUrl: true,
            coverUrl: true,
            primaryColor: true,
          },
        },
      },
    });
    return this.normalizeOrder(updated);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('orders')
class BuyerOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @SystemContext()
  @Post('checkout')
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.orders.checkout(user.sub, dto);
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.orders.buyerOrders(user.sub);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.cancelBuyerOrder(user.sub, id);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Controller('vendor/orders')
class VendorOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.orders.vendorOrders(user.tenantId!);
  }

  @Patch(':id/status')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: OrderStatusDto) {
    return this.orders.updateVendorStatus(user.tenantId!, id, dto.status);
  }
}

@Module({
  imports: [CartModule, PaymentsModule],
  controllers: [BuyerOrdersController, VendorOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
