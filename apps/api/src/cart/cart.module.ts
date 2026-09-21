import { BadRequestException, Body, Controller, Delete, Get, Injectable, Module, OnModuleDestroy, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsInt, IsString, Min } from 'class-validator';
import Redis from 'ioredis';
import { DbService } from '../common/db.service';
import { AuthUser, CurrentUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards';
import { ProductStatus } from '@multiventas/db';

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

  constructor(private readonly db: DbService) {}

  private key(userId: string) { return `cart:${userId}`; }

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
    return cart;
  }

  async remove(userId: string, productId: string) {
    const cart = (await this.get(userId)).filter((x) => x.productId !== productId);
    await this.redis.set(this.key(userId), JSON.stringify(cart), 'EX', 60 * 60 * 24 * 30);
    return cart;
  }

  clear(userId: string) { return this.redis.del(this.key(userId)); }
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

@Module({ controllers: [CartController], providers: [CartService], exports: [CartService] })
export class CartModule {}
