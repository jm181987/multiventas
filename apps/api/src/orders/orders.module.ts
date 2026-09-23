import { BadRequestException, Body, Controller, Get, Injectable, Module, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { DbService } from '../common/db.service';
import { CartModule, CartService } from '../cart/cart.module';
import { PaymentsModule } from '../payments/payments.module';
import { MercadoPagoService } from '../payments/mercado-pago.service';
import { AuthUser, CurrentUser, Roles, SystemContext } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { DeliveryMethodType, NotificationType, OrderStatus, ProductStatus, UserRole } from '@multiventas/db';
import { StorageService } from '../storage/storage.module';
import { PromotionsModule, PromotionsService } from '../promotions/promotions.module';
import { NotificationsModule, NotificationsService } from '../notifications/notifications.module';

class CheckoutDto {
  @IsOptional() @IsObject() shippingAddress?: Record<string, unknown>;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() deviceId?: string;
  @IsOptional() @IsString() @MaxLength(80) couponCode?: string;
  @IsOptional() @IsObject() deliverySelections?: Record<string, string>;
}

class CheckoutPreviewDto {
  @IsOptional() @IsString() @MaxLength(80) couponCode?: string;
  @IsOptional() @IsObject() deliverySelections?: Record<string, string>;
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
    private readonly promotions: PromotionsService,
    private readonly notifications: NotificationsService,
  ) {}

  private normalizeDeviceId(deviceId?: string) {
    if (!deviceId) return undefined;
    // Mercado Pago genera este valor como un identificador opaco. No debe truncarse.
    // Si llega algo anormalmente grande, se omite para no romper el checkout ni
    // convertir un valor controlado por el cliente en un header excesivo.
    return deviceId.length <= 4096 ? deviceId : undefined;
  }

  private normalizeStore<T extends { logoUrl?: string | null; coverUrl?: string | null }>(store: T): T {
    return {
      ...store,
      logoUrl: store.logoUrl ? this.storage.normalizeMediaUrl(store.logoUrl) : null,
      coverUrl: store.coverUrl ? this.storage.normalizeMediaUrl(store.coverUrl) : null,
    };
  }

  private normalizeOrder<T>(order: T): T {
    const value = order as any;
    return {
      ...value,
      store: value.store ? this.normalizeStore(value.store) : value.store,
      buyer: value.buyer ? {
        ...value.buyer,
        avatarUrl: value.buyer.avatarUrl ? this.storage.normalizeMediaUrl(value.buyer.avatarUrl) : null,
      } : value.buyer,
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

  private resolveDelivery(
    product: any,
    selectedType?: string,
    requireExplicit = false,
  ) {
    const options = (product.deliveryOptions ?? []).filter((option: any) => option.isActive !== false);
    if (!options.length) {
      return {
        type: null as DeliveryMethodType | null,
        fee: 0,
        details: 'Entrega a coordinar con el vendedor',
        legacy: true,
      };
    }

    if (requireExplicit && options.length > 1 && !selectedType) {
      throw new BadRequestException(`Elegí cómo querés recibir ${product.title}`);
    }

    const selected = selectedType
      ? options.find((option: any) => option.type === selectedType)
      : options[0];

    if (!selected) {
      throw new BadRequestException(`El método de entrega elegido no está disponible para ${product.title}`);
    }

    return {
      type: selected.type as DeliveryMethodType,
      fee: selected.type === DeliveryMethodType.SHIPPING_PAID ? Number(selected.fee) : 0,
      details: selected.details ?? null,
      legacy: false,
    };
  }

  async preview(
    userId: string,
    couponCode?: string,
    deliverySelections: Record<string, string> = {},
  ) {
    const cart = await this.cart.get(userId);
    if (!cart.length) throw new BadRequestException('El carrito está vacío');

    const products = await this.db.client.product.findMany({
      where: { id: { in: cart.map((x) => x.productId) }, status: ProductStatus.ACTIVE, deletedAt: null },
      include: {
        store: true,
        deliveryOptions: { where: { isActive: true }, orderBy: { type: 'asc' } },
      },
    });
    if (products.length !== cart.length) throw new BadRequestException('Hay productos no disponibles');

    const grouped = new Map<string, {
      storeId: string;
      storeName: string;
      rows: Array<{ product: any; quantity: number }>;
    }>();

    for (const item of cart) {
      const product = products.find((p) => p.id === item.productId)!;
      const group = grouped.get(product.storeId) ?? {
        storeId: product.storeId,
        storeName: product.store.name,
        rows: [],
      };
      group.rows.push({ product, quantity: item.quantity });
      grouped.set(product.storeId, group);
    }

    let matched = false;
    const groups = [];

    for (const group of grouped.values()) {
      const subtotal = Math.round(
        group.rows.reduce((sum, row) => sum + Number(row.product.price) * row.quantity, 0) * 100,
      ) / 100;
      const applied = couponCode
        ? await this.promotions.applicable(group.storeId, couponCode, subtotal)
        : null;
      if (applied) matched = true;

      const items = group.rows.map(({ product, quantity }) => {
        const selectedDelivery = this.resolveDelivery(product, deliverySelections[product.id], false);
        return {
          productId: product.id,
          title: product.title,
          quantity,
          deliveryOptions: (product.deliveryOptions ?? []).map((option: any) => ({
            type: option.type,
            fee: Number(option.fee),
            details: option.details,
          })),
          selectedDelivery,
        };
      });

      const shippingAmount = Math.round(
        items.reduce((sum, item) => sum + Number(item.selectedDelivery.fee ?? 0), 0) * 100,
      ) / 100;
      const discountAmount = applied?.discount ?? 0;
      const total = Math.round((subtotal + shippingAmount - discountAmount) * 100) / 100;

      groups.push({
        storeId: group.storeId,
        storeName: group.storeName,
        subtotal,
        shippingAmount,
        discountAmount,
        total,
        couponCode: applied?.code ?? null,
        items,
      });
    }

    if (couponCode && !matched) {
      throw new BadRequestException('El cupón no es válido para los productos de este carrito');
    }

    return {
      groups,
      subtotal: Math.round(groups.reduce((sum, group) => sum + group.subtotal, 0) * 100) / 100,
      shippingAmount: Math.round(groups.reduce((sum, group) => sum + group.shippingAmount, 0) * 100) / 100,
      discountAmount: Math.round(groups.reduce((sum, group) => sum + group.discountAmount, 0) * 100) / 100,
      total: Math.round(groups.reduce((sum, group) => sum + group.total, 0) * 100) / 100,
      requiresShippingAddress: groups.some((group) =>
        group.items.some((item) =>
          item.selectedDelivery.type === DeliveryMethodType.SHIPPING_PAID
          || item.selectedDelivery.type === DeliveryMethodType.SHIPPING_FREE,
        ),
      ),
    };
  }

  async checkout(userId: string, dto: CheckoutDto) {
    const cart = await this.cart.get(userId);
    if (!cart.length) throw new BadRequestException('El carrito está vacío');

    const products = await this.db.client.product.findMany({
      where: { id: { in: cart.map((x) => x.productId) }, status: ProductStatus.ACTIVE, deletedAt: null },
      include: {
        store: true,
        deliveryOptions: { where: { isActive: true }, orderBy: { type: 'asc' } },
      },
    });
    if (products.length !== cart.length) throw new BadRequestException('Hay productos no disponibles');

    const grouped = new Map<string, {
      storeId: string;
      tenantId: string;
      storeName: string;
      rows: Array<{ product: any; quantity: number }>;
    }>();

    for (const item of cart) {
      const product = products.find((p) => p.id === item.productId)!;
      if (product.stock < item.quantity) throw new BadRequestException(`Stock insuficiente para ${product.title}`);
      const group = grouped.get(product.storeId) ?? {
        storeId: product.storeId,
        tenantId: product.tenantId,
        storeName: product.store.name,
        rows: [],
      };
      group.rows.push({ product, quantity: item.quantity });
      grouped.set(product.storeId, group);
    }

    const selections = dto.deliverySelections ?? {};
    const prepared = [];
    let couponMatched = false;

    for (const group of grouped.values()) {
      const subtotal = Math.round(
        group.rows.reduce((sum, row) => sum + Number(row.product.price) * row.quantity, 0) * 100,
      ) / 100;
      const applied = dto.couponCode
        ? await this.promotions.applicable(group.storeId, dto.couponCode, subtotal)
        : null;
      if (applied) couponMatched = true;

      const deliveries = group.rows.map(({ product }) => ({
        productId: product.id,
        ...this.resolveDelivery(product, selections[product.id], true),
      }));
      const shippingAmount = Math.round(
        deliveries.reduce((sum, delivery) => sum + Number(delivery.fee ?? 0), 0) * 100,
      ) / 100;
      const requiresAddress = deliveries.some((delivery) =>
        delivery.type === DeliveryMethodType.SHIPPING_PAID
        || delivery.type === DeliveryMethodType.SHIPPING_FREE,
      );

      if (requiresAddress && !String(dto.shippingAddress?.address ?? '').trim()) {
        throw new BadRequestException('Ingresá una dirección para los productos con envío');
      }

      prepared.push({ group, subtotal, applied, deliveries, shippingAmount, requiresAddress });
    }

    if (dto.couponCode && !couponMatched) {
      throw new BadRequestException('El cupón no es válido para los productos de este carrito');
    }

    const checkouts = [];
    for (const { group, subtotal, applied, deliveries, shippingAmount, requiresAddress } of prepared) {
      const discountAmount = applied?.discount ?? 0;
      const total = Math.round((subtotal + shippingAmount - discountAmount) * 100) / 100;
      const deliveryMap = new Map(deliveries.map((delivery) => [delivery.productId, delivery]));

      const order = await this.db.client.order.create({
        data: {
          tenantId: group.tenantId,
          storeId: group.storeId,
          buyerId: userId,
          subtotal,
          shippingAmount,
          discountAmount,
          total,
          promotionId: applied?.promotion.id,
          couponCode: applied?.code,
          shippingAddress: requiresAddress ? dto.shippingAddress as any : undefined,
          notes: dto.notes,
          items: {
            create: group.rows.map(({ product, quantity }) => {
              const delivery = deliveryMap.get(product.id)!;
              return {
                tenantId: group.tenantId,
                productId: product.id,
                title: product.title,
                sku: product.sku,
                quantity,
                unitPrice: product.price,
                total: Number(product.price) * quantity,
                deliveryMethod: delivery.type,
                deliveryAmount: delivery.fee,
                deliveryDetails: delivery.details,
              };
            }),
          },
        },
      });

      for (const { product, quantity } of group.rows) {
        const updated = await this.db.client.product.updateMany({
          where: { id: product.id, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (updated.count !== 1) throw new BadRequestException(`Stock modificado para ${product.title}`);

        const remainingStock = product.stock - quantity;
        if (product.stock > 5 && remainingStock <= 5) {
          await this.notifications.createForVendor(group.tenantId, {
            type: NotificationType.STOCK_LOW,
            title: 'Stock bajo',
            message: `${product.title} quedó con ${remainingStock} unidades disponibles.`,
            href: '/vendor/productos',
            metadata: { productId: product.id, remainingStock },
          });
        }
      }

      const preference = await this.mp.createPreference(order.id, this.normalizeDeviceId(dto.deviceId));

      await this.notifications.createForVendor(group.tenantId, {
        type: NotificationType.ORDER_CREATED,
        title: 'Nuevo pedido',
        message: `Recibiste un pedido en ${group.storeName}. Está pendiente de confirmación de pago.`,
        href: '/vendor/pedidos',
        metadata: { orderId: order.id, total },
      });

      checkouts.push({
        orderId: order.id,
        preferenceId: preference.id,
        initPoint: preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point,
        marketplaceFee: preference.marketplaceFee,
        subtotal,
        shippingAmount,
        discountAmount,
        total,
        couponCode: applied?.code ?? null,
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
            review: {
              select: {
                id: true,
                rating: true,
                comment: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
        payment: true,
        store: { select: { id: true, slug: true, name: true, logoUrl: true, coverUrl: true, primaryColor: true } },
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
        store: { select: { id: true, slug: true, name: true, logoUrl: true, coverUrl: true, primaryColor: true } },
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

    const moved = await this.db.client.order.updateMany({
      where: { id, tenantId, status: order.status },
      data: { status },
    });
    if (moved.count !== 1) {
      throw new BadRequestException('El pedido cambió de estado. Recarga e intenta nuevamente');
    }

    if (status === OrderStatus.CANCELLED && order.status === OrderStatus.PENDING) {
      await this.restoreStock(order.items);
    }

    const updated = await this.db.client.order.findUniqueOrThrow({
      where: { id },
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
        store: { select: { id: true, slug: true, name: true, logoUrl: true, coverUrl: true, primaryColor: true } },
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

    const moved = await this.db.client.order.updateMany({
      where: { id, buyerId: userId, status: OrderStatus.PENDING },
      data: { status: OrderStatus.CANCELLED },
    });
    if (moved.count !== 1) {
      throw new BadRequestException('El pedido ya cambió de estado. Recarga la página');
    }

    await this.restoreStock(order.items);

    const updated = await this.db.client.order.findUniqueOrThrow({
      where: { id },
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
        store: { select: { id: true, slug: true, name: true, logoUrl: true, coverUrl: true, primaryColor: true } },
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
  @Post('checkout/preview')
  preview(@CurrentUser() user: AuthUser, @Body() dto: CheckoutPreviewDto) {
    return this.orders.preview(user.sub, dto.couponCode, dto.deliverySelections ?? {});
  }

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
  imports: [CartModule, PaymentsModule, PromotionsModule, NotificationsModule],
  controllers: [BuyerOrdersController, VendorOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
