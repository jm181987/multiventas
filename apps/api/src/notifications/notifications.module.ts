import { Controller, Get, Injectable, Module, Param, Patch, UseGuards } from '@nestjs/common';
import { NotificationType } from '@multiventas/db';
import { DbService } from '../common/db.service';
import { AuthUser, CurrentUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards';

type NotificationInput = {
  userId: string;
  tenantId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  href?: string | null;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DbService) {}

  async create(input: NotificationInput) {
    return this.db.runSystem(() => this.db.client.notification.create({
      data: {
        userId: input.userId,
        tenantId: input.tenantId ?? null,
        type: input.type,
        title: input.title,
        message: input.message,
        href: input.href ?? null,
        metadata: input.metadata as any,
      },
    }));
  }

  async createForAdmins(input: Omit<NotificationInput, 'userId' | 'tenantId'>) {
    const admins = await this.db.runSystem(() => this.db.client.user.findMany({
      where: { roles: { has: 'ADMIN' }, deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    }));
    return Promise.all(admins.map((admin) => this.create({ ...input, userId: admin.id })));
  }

  async createForVendor(tenantId: string, input: Omit<NotificationInput, 'userId' | 'tenantId'>) {
    const vendor = await this.db.runSystem(() => this.db.client.vendor.findUnique({
      where: { id: tenantId },
      select: { userId: true },
    }));
    if (!vendor) return null;
    return this.create({ ...input, userId: vendor.userId, tenantId });
  }

  async list(userId: string) {
    const [items, unread] = await Promise.all([
      this.db.client.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 40,
      }),
      this.db.client.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { items, unread };
  }

  async markRead(userId: string, id: string) {
    await this.db.client.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.db.client.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}

@UseGuards(JwtAuthGuard)
@Controller('notifications')
class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.notifications.list(user.sub);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.sub);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(user.sub, id);
  }
}

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
