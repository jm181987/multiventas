import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { NotificationType, OrderStatus, SupportCaseStatus, UserRole } from '@multiventas/db';
import { DbService } from '../common/db.service';
import { AuthUser, CurrentUser, Roles, SystemContext } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { NotificationsModule, NotificationsService } from '../notifications/notifications.module';

class SendMessageDto {
  @IsString() @MaxLength(2000) message!: string;
}

class CreateSupportCaseDto {
  @IsString() @MaxLength(180) subject!: string;
  @IsString() @MaxLength(3000) description!: string;
}

class UpdateSupportCaseDto {
  @IsIn([
    SupportCaseStatus.OPEN,
    SupportCaseStatus.IN_REVIEW,
    SupportCaseStatus.RESOLVED,
    SupportCaseStatus.CLOSED,
  ])
  status!: SupportCaseStatus;

  @IsOptional() @IsString() @MaxLength(3000) adminNote?: string;
}

class AdminSupportQueryDto {
  @IsOptional()
  @IsIn([
    SupportCaseStatus.OPEN,
    SupportCaseStatus.IN_REVIEW,
    SupportCaseStatus.RESOLVED,
    SupportCaseStatus.CLOSED,
  ])
  status?: SupportCaseStatus;
}

type ParticipantContext = {
  order: any;
  role: UserRole.BUYER | UserRole.VENDOR;
  recipientUserId: string;
  recipientName: string;
};

@Injectable()
class ConversationsService {
  constructor(
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
  ) {}

  private async participant(orderId: string, userId: string): Promise<ParticipantContext> {
    const order = await this.db.runSystem(() => this.db.client.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { id: true, name: true } },
        vendor: {
          select: {
            id: true,
            businessName: true,
            user: { select: { id: true, name: true } },
          },
        },
        store: { select: { id: true, name: true, slug: true } },
        items: {
          select: {
            id: true,
            title: true,
            deliveryMethod: true,
            deliveryDetails: true,
          },
        },
      },
    }));

    if (!order) throw new BadRequestException('Pedido inválido');

    if (order.buyerId === userId) {
      return {
        order,
        role: UserRole.BUYER,
        recipientUserId: order.vendor.user.id,
        recipientName: order.vendor.businessName || order.vendor.user.name,
      };
    }

    if (order.vendor.user.id === userId) {
      return {
        order,
        role: UserRole.VENDOR,
        recipientUserId: order.buyer.id,
        recipientName: order.buyer.name,
      };
    }

    throw new ForbiddenException('No tenés acceso a esta conversación');
  }

  async conversation(orderId: string, userId: string) {
    const ctx = await this.participant(orderId, userId);
    const messages = await this.db.runSystem(() => this.db.client.orderMessage.findMany({
      where: { orderId },
      include: { sender: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
      take: 200,
    }));

    const unread = messages.filter((message) => message.senderUserId !== userId && !message.readAt).length;

    if (unread) {
      await this.db.runSystem(() => this.db.client.orderMessage.updateMany({
        where: { orderId, senderUserId: { not: userId }, readAt: null },
        data: { readAt: new Date() },
      }));
    }

    const supportCases = await this.db.runSystem(() => this.db.client.supportCase.findMany({
      where: { orderId },
      select: {
        id: true,
        status: true,
        subject: true,
        description: true,
        adminNote: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        createdByUserId: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }));

    return {
      order: {
        id: ctx.order.id,
        status: ctx.order.status,
        store: ctx.order.store,
        items: ctx.order.items,
      },
      role: ctx.role,
      recipientName: ctx.recipientName,
      canMessage: [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(ctx.order.status),
      unreadBeforeOpen: unread,
      messages,
      supportCases,
    };
  }

  async send(orderId: string, userId: string, dto: SendMessageDto) {
    const ctx = await this.participant(orderId, userId);
    if (![OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(ctx.order.status)) {
      throw new BadRequestException('La conversación se habilita cuando el pedido está confirmado');
    }

    const message = dto.message.trim();
    if (!message) throw new BadRequestException('Escribí un mensaje');

    const created = await this.db.runSystem(() => this.db.client.orderMessage.create({
      data: {
        tenantId: ctx.order.tenantId,
        orderId,
        senderUserId: userId,
        senderRole: ctx.role,
        message,
      },
      include: { sender: { select: { id: true, name: true } } },
    }));

    const href = ctx.role === UserRole.BUYER ? '/vendor/pedidos' : '/mis-pedidos';
    await this.notifications.create({
      userId: ctx.recipientUserId,
      tenantId: ctx.order.tenantId,
      type: NotificationType.MESSAGE_RECEIVED,
      title: 'Nuevo mensaje sobre un pedido',
      message: ctx.role === UserRole.BUYER
        ? `Un comprador te escribió por el pedido #${orderId.slice(0, 8).toUpperCase()}.`
        : `${ctx.order.store.name} te escribió por tu pedido.`,
      href,
      metadata: { orderId, messageId: created.id },
    });

    return created;
  }

  async unread(userId: string) {
    return this.db.runSystem(async () => {
      const vendor = await this.db.client.vendor.findUnique({
        where: { userId },
        select: { id: true },
      });

      const orders = await this.db.client.order.findMany({
        where: {
          OR: [
            { buyerId: userId },
            ...(vendor ? [{ tenantId: vendor.id }] : []),
          ],
        },
        select: { id: true },
      });

      const orderIds = orders.map((order) => order.id);
      if (!orderIds.length) return { total: 0, byOrder: {} as Record<string, number> };

      const messages = await this.db.client.orderMessage.findMany({
        where: {
          orderId: { in: orderIds },
          senderUserId: { not: userId },
          readAt: null,
        },
        select: { orderId: true },
      });

      const byOrder: Record<string, number> = {};
      for (const message of messages) {
        byOrder[message.orderId] = (byOrder[message.orderId] ?? 0) + 1;
      }
      return { total: messages.length, byOrder };
    });
  }

  async createSupportCase(orderId: string, userId: string, dto: CreateSupportCaseDto) {
    const ctx = await this.participant(orderId, userId);
    const subject = dto.subject.trim();
    const description = dto.description.trim();
    if (!subject || !description) throw new BadRequestException('Completá asunto y descripción');

    const existing = await this.db.runSystem(() => this.db.client.supportCase.findFirst({
      where: {
        orderId,
        createdByUserId: userId,
        status: { in: [SupportCaseStatus.OPEN, SupportCaseStatus.IN_REVIEW] },
      },
      select: { id: true },
    }));
    if (existing) throw new BadRequestException('Ya tenés un caso de soporte abierto para este pedido');

    const created = await this.db.runSystem(() => this.db.client.supportCase.create({
      data: {
        tenantId: ctx.order.tenantId,
        orderId,
        createdByUserId: userId,
        subject,
        description,
      },
    }));

    await this.notifications.createForAdmins({
      type: NotificationType.SUPPORT_CASE_CREATED,
      title: 'Nuevo caso de soporte',
      message: `Se abrió un caso para el pedido #${orderId.slice(0, 8).toUpperCase()}: ${subject}`,
      href: '/admin/soporte',
      metadata: { supportCaseId: created.id, orderId },
    });

    return created;
  }

  async adminList(status?: SupportCaseStatus) {
    return this.db.runSystem(() => this.db.client.supportCase.findMany({
      where: status ? { status } : undefined,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        order: {
          select: {
            id: true,
            status: true,
            total: true,
            currency: true,
            createdAt: true,
            store: { select: { id: true, name: true, slug: true } },
            buyer: { select: { id: true, name: true, email: true } },
            vendor: {
              select: {
                id: true,
                businessName: true,
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    }));
  }

  async adminUpdate(id: string, dto: UpdateSupportCaseDto) {
    const updated = await this.db.runSystem(() => this.db.client.supportCase.update({
      where: { id },
      data: {
        status: dto.status,
        adminNote: dto.adminNote?.trim() || undefined,
        resolvedAt: dto.status === SupportCaseStatus.RESOLVED || dto.status === SupportCaseStatus.CLOSED
          ? new Date()
          : null,
      },
      include: {
        order: { select: { id: true } },
      },
    }));

    await this.notifications.create({
      userId: updated.createdByUserId,
      tenantId: updated.tenantId,
      type: NotificationType.SUPPORT_CASE_UPDATED,
      title: 'Tu caso de soporte fue actualizado',
      message: dto.status === SupportCaseStatus.RESOLVED
        ? 'El equipo de SeVende marcó tu caso como resuelto.'
        : dto.status === SupportCaseStatus.CLOSED
          ? 'El equipo de SeVende cerró tu caso de soporte.'
          : 'El equipo de SeVende está revisando tu caso.',
      href: updated.createdByUserId ? '/mis-pedidos' : null,
      metadata: { supportCaseId: updated.id, orderId: updated.order.id, status: updated.status },
    });

    return updated;
  }
}

@UseGuards(JwtAuthGuard)
@SystemContext()
@Controller('order-conversations')
class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get('unread')
  unread(@CurrentUser() user: AuthUser) {
    return this.conversations.unread(user.sub);
  }

  @Get(':orderId')
  conversation(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.conversations.conversation(orderId, user.sub);
  }

  @Post(':orderId/messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.conversations.send(orderId, user.sub, dto);
  }

  @Post(':orderId/support')
  support(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Body() dto: CreateSupportCaseDto,
  ) {
    return this.conversations.createSupportCase(orderId, user.sub, dto);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@SystemContext()
@Controller('admin/support-cases')
class AdminSupportController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  list(@Query() query: AdminSupportQueryDto) {
    return this.conversations.adminList(query.status);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSupportCaseDto) {
    return this.conversations.adminUpdate(id, dto);
  }
}

@Module({
  imports: [NotificationsModule],
  controllers: [ConversationsController, AdminSupportController],
  providers: [ConversationsService],
})
export class ConversationsModule {}
