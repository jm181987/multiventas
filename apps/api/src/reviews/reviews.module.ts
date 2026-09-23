import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { OrderStatus, ReviewStatus, UserRole } from '@multiventas/db';
import { DbService } from '../common/db.service';
import { AuthUser, CurrentUser, Roles, SystemContext } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';

class CreateReviewDto {
  @IsString() orderItemId!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
}

class ReviewModerationDto {
  @IsIn([ReviewStatus.PUBLISHED, ReviewStatus.REJECTED]) status!: ReviewStatus;
}

class ReviewListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 10;
}

class AdminReviewQueryDto {
  @IsOptional() @IsIn([ReviewStatus.PENDING, ReviewStatus.PUBLISHED, ReviewStatus.REJECTED]) status?: ReviewStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50;
}

@Injectable()
class ReviewsService {
  constructor(private readonly db: DbService) {}

  private publicBuyerName(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'Comprador verificado';
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1].slice(0, 1).toUpperCase()}.`;
  }

  private async summary(where: { productId?: string; storeId?: string }) {
    const [aggregate, groups] = await Promise.all([
      this.db.client.review.aggregate({
        where: { ...where, status: ReviewStatus.PUBLISHED },
        _avg: { rating: true },
        _count: { id: true },
      }),
      this.db.client.review.groupBy({
        by: ['rating'],
        where: { ...where, status: ReviewStatus.PUBLISHED },
        _count: { rating: true },
        orderBy: { rating: 'desc' },
      }),
    ]);

    const distribution = [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: groups.find((item) => item.rating === rating)?._count.rating ?? 0,
    }));

    return {
      average: aggregate._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : 0,
      count: aggregate._count.id,
      distribution,
    };
  }

  productSummary(productId: string) {
    return this.summary({ productId });
  }

  storeSummary(storeId: string) {
    return this.summary({ storeId });
  }

  async productReviews(productId: string, query: ReviewListQueryDto) {
    const where = { productId, status: ReviewStatus.PUBLISHED };
    const [items, total, summary] = await Promise.all([
      this.db.client.review.findMany({
        where,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          orderItemId: true,
          buyer: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.client.review.count({ where }),
      this.productSummary(productId),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        rating: item.rating,
        comment: item.comment,
        createdAt: item.createdAt,
        verifiedPurchase: Boolean(item.orderItemId),
        buyerName: this.publicBuyerName(item.buyer.name),
      })),
      total,
      page: query.page,
      limit: query.limit,
      summary,
    };
  }

  async create(userId: string, dto: CreateReviewDto) {
    const item = await this.db.client.orderItem.findFirst({
      where: {
        id: dto.orderItemId,
        productId: { not: null },
        order: {
          buyerId: userId,
          status: OrderStatus.DELIVERED,
        },
      },
      include: {
        order: { select: { storeId: true, tenantId: true } },
        review: { select: { id: true } },
      },
    });

    if (!item || !item.productId) {
      throw new BadRequestException('Solo podés opinar sobre productos de pedidos entregados');
    }
    if (item.review) throw new BadRequestException('Ya opinaste sobre este producto en este pedido');

    return this.db.client.review.create({
      data: {
        tenantId: item.order.tenantId,
        storeId: item.order.storeId,
        productId: item.productId,
        buyerId: userId,
        orderItemId: item.id,
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
        status: ReviewStatus.PENDING,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        status: true,
        createdAt: true,
        orderItemId: true,
      },
    });
  }

  async adminList(query: AdminReviewQueryDto) {
    const where = query.status ? { status: query.status } : {};
    const [items, total] = await Promise.all([
      this.db.client.review.findMany({
        where,
        include: {
          buyer: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, title: true, slug: true } },
          store: { select: { id: true, name: true, slug: true } },
          orderItem: { select: { id: true, orderId: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.client.review.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  moderate(id: string, status: ReviewStatus) {
    return this.db.client.review.update({
      where: { id },
      data: { status },
      include: {
        buyer: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, title: true } },
        store: { select: { id: true, name: true, slug: true } },
      },
    });
  }
}

@Controller('reviews')
class PublicReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('products/:productId')
  productReviews(@Param('productId') productId: string, @Query() query: ReviewListQueryDto) {
    return this.reviews.productReviews(productId, query);
  }

  @Get('products/:productId/summary')
  productSummary(@Param('productId') productId: string) {
    return this.reviews.productSummary(productId);
  }

  @Get('stores/:storeId/summary')
  storeSummary(@Param('storeId') storeId: string) {
    return this.reviews.storeSummary(storeId);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('reviews')
class BuyerReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @SystemContext()
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReviewDto) {
    return this.reviews.create(user.sub, dto);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/reviews')
class AdminReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(@Query() query: AdminReviewQueryDto) {
    return this.reviews.adminList(query);
  }

  @Patch(':id')
  moderate(@Param('id') id: string, @Body() dto: ReviewModerationDto) {
    return this.reviews.moderate(id, dto.status);
  }
}

@Module({
  controllers: [PublicReviewsController, BuyerReviewsController, AdminReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
