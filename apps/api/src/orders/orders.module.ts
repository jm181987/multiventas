import { BadRequestException, Body, Controller, Get, Injectable, Module, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { DbService } from '../common/db.service';
import { CartModule, CartService } from '../cart/cart.module';
import { PaymentsModule } from '../payments/payments.module';
import { MercadoPagoService } from '../payments/mercado-pago.service';
import { AuthUser, CurrentUser, Roles, SystemContext } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { OrderStatus, ProductStatus, UserRole } from '@multiventas/db';

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
  ) {}

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

  buyerOrders(userId: string) {
    return this.db.client.order.findMany({
      where: { buyerId: userId },
      include: { items: true, payment: true, store: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  vendorOrders() {
    return this.db.client.order.findMany({
      include: { items: true, payment: true, buyer: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  updateStatus(id: string, status: OrderStatus) {
    return this.db.client.order.update({ where: { id }, data: { status } });
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
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Controller('vendor/orders')
class VendorOrdersController {
  constructor(private readonly orders: OrdersService) {}
  @Get() list() { return this.orders.vendorOrders(); }
  @Patch(':id/status') update(@Param('id') id: string, @Body() dto: OrderStatusDto) {
    return this.orders.updateStatus(id, dto.status);
  }
}

@Module({
  imports: [CartModule, PaymentsModule],
  controllers: [BuyerOrdersController, VendorOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
