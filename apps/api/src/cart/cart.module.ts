import { BadRequestException, Body, Controller, Delete, Get, Injectable, Module, OnModuleDestroy, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IsInt, IsString, Min } from 'class-validator';
import Redis from 'ioredis';
import { DbService } from '../common/db.service';
import { AuthUser, CurrentUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards';
import { NotificationType, ProductStatus } from '@multiventas/db';
import { NotificationsModule, NotificationsService } from '../notifications/notifications.module';

export type CartItem = { productId: string; quantity: number };

class CartItemDto {
  @IsString() productId!: string;
  @IsInt() @Min(1) quantity!: number;
}

class CartQuantityDto {
  @IsInt() @Min(1) quantity!: number;
}

@Injectable()
export class CartService implements OnModuleDestroy {
  private readonly redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: 2,
  });

  constructor(
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
  ) {}

  private key(userId: string) { return `cart:${userId}`; }
  private metaKey(userId: string) { return `cart-meta:${userId}`; }

  private async touch(userId: string, hasItems = true) {
    if (!hasItems) {
      await this.redis.del(this.metaKey(userId));
      return;
    }
    await this.redis.set(
      this.metaKey(userId),
      JSON.stringify({ updatedAt: Date.now(), remindedAt: null }),
      'EX',
      60 * 60 * 24 * 30,
    );
  }

  async get(userId: string): Promise<CartItem[]> {
    const raw = await this.redis.get(this.key(userId));
    return raw ? JSON.parse(raw) : [];
  }

  async add(userId: string, item: CartItem) {
    const product = await this.db.client.product.findFirst({
      where: { id: item.productId, status: ProductStatus.ACTIVE, deletedAt: null },
    });
    if (!product || product.stock < item.quantity) throw new BadRequestException('Producto sin stock suficiente');

    const cart = await this.get(userId);
    const existing = cart.find((x) => x.productId === item.productId);
    if (existing) existing.quantity = Math.min(product.stock, existing.quantity + item.quantity);
    else cart.push(item);
    await this.redis.set(this.key(userId), JSON.stringify(cart), 'EX', 60 * 60 * 24 * 30);
    await this.touch(userId, cart.length > 0);
    return cart;
  }

  async update(userId: string, productId: string, quantity: number) {
    const product = await this.db.client.product.findFirst({
      where: { id: productId, status: ProductStatus.ACTIVE, deletedAt: null },
    });
    if (!product) throw new BadRequestException('Producto no disponible');
    if (quantity > product.stock) throw new BadRequestException('Producto sin stock suficiente');

    const cart = await this.get(userId);
    const item = cart.find((x) => x.productId === productId);
    if (!item) throw new BadRequestException('Producto no está en el carrito');
    item.quantity = quantity;
    await this.redis.set(this.key(userId), JSON.stringify(cart), 'EX', 60 * 60 * 24 * 30);
    await this.touch(userId, cart.length > 0);
    return cart;
  }

  async remove(userId: string, productId: string) {
    const cart = (await this.get(userId)).filter((x) => x.productId !== productId);
    await this.redis.set(this.key(userId), JSON.stringify(cart), 'EX', 60 * 60 * 24 * 30);
    await this.touch(userId, cart.length > 0);
    return cart;
  }

  async clear(userId: string) {
    return this.redis.del(this.key(userId), this.metaKey(userId));
  }

  @Cron(CronExpression.EVERY_HOUR)
  async remindAbandonedCarts() {
    const thresholdHours = Math.max(1, Number(process.env.CART_ABANDONED_HOURS ?? '3'));
    const thresholdMs = thresholdHours * 60 * 60 * 1000;
    let cursor = '0';

    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', 'cart:*', 'COUNT', 100);
      cursor = nextCursor;

      for (const key of keys) {
        const userId = key.slice('cart:'.length);
        if (!userId) continue;

        const [rawCart, rawMeta] = await Promise.all([
          this.redis.get(key),
          this.redis.get(this.metaKey(userId)),
        ]);

        const cart = rawCart ? JSON.parse(rawCart) as CartItem[] : [];
        if (!cart.length) {
          await this.redis.del(this.metaKey(userId));
          continue;
        }

        if (!rawMeta) {
          await this.touch(userId, true);
          continue;
        }

        const meta = JSON.parse(rawMeta) as { updatedAt?: number; remindedAt?: number | null };
        const updatedAt = Number(meta.updatedAt ?? Date.now());
        if (Date.now() - updatedAt < thresholdMs) continue;
        if (meta.remindedAt && meta.remindedAt >= updatedAt) continue;

        const lockKey = `cart-reminder-lock:${userId}:${updatedAt}`;
        const locked = await this.redis.set(lockKey, '1', 'EX', 60 * 60 * 24 * 30, 'NX');
        if (!locked) continue;

        try {
          await this.notifications.create({
            userId,
            type: NotificationType.CART_ABANDONED,
            title: 'Tu carrito te está esperando',
            message: cart.length === 1
              ? 'Guardaste un producto en tu carrito. Podés retomar la compra cuando quieras.'
              : `Tenés ${cart.length} productos en tu carrito. Retomá tu compra cuando quieras.`,
            href: '/checkout',
            metadata: { itemCount: cart.length, updatedAt },
          });
          await this.redis.set(
            this.metaKey(userId),
            JSON.stringify({ updatedAt, remindedAt: Date.now() }),
            'EX',
            60 * 60 * 24 * 30,
          );
        } catch {
          await this.redis.del(lockKey);
        }
      }
    } while (cursor !== '0');
  }

  onModuleDestroy() { return this.redis.quit(); }
}

@UseGuards(JwtAuthGuard)
@Controller('cart')
class CartController {
  constructor(private readonly cart: CartService) {}
  @Get() get(@CurrentUser() user: AuthUser) { return this.cart.get(user.sub); }
  @Post() add(@CurrentUser() user: AuthUser, @Body() dto: CartItemDto) { return this.cart.add(user.sub, dto); }
  @Patch(':productId') update(@CurrentUser() user: AuthUser, @Param('productId') id: string, @Body() dto: CartQuantityDto) {
    return this.cart.update(user.sub, id, dto.quantity);
  }
  @Delete(':productId') remove(@CurrentUser() user: AuthUser, @Param('productId') id: string) {
    return this.cart.remove(user.sub, id);
  }
}

@Module({ imports: [NotificationsModule], controllers: [CartController], providers: [CartService], exports: [CartService] })
export class CartModule {}
