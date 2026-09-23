import { Body, Controller, Headers, Injectable, Module, OnModuleDestroy, OnModuleInit, Post, Query } from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { PaymentsModule } from '../payments/payments.module';
import { MercadoPagoService } from '../payments/mercado-pago.service';
import { DbService } from '../common/db.service';
import { SystemContext } from '../common/decorators';
import { NotificationType, PaymentStatus } from '@multiventas/db';
import { NotificationsModule, NotificationsService } from '../notifications/notifications.module';

@Injectable()
class WebhookQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
  private readonly workerConnection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
  private queue!: Queue;
  private worker!: Worker;

  constructor(
    private readonly db: DbService,
    private readonly mp: MercadoPagoService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    this.queue = new Queue('payment-webhooks', { connection: this.connection as any });
    this.worker = new Worker('payment-webhooks', async (job: Job) => {
      if (job.name === 'mercadopago') {
        const result = await this.db.runSystem(() => this.mp.processWebhookNotification(job.data.payload));
        if (!result || !('processed' in result) || !result.processed || !result.changed) return result;

        const order = await this.db.runSystem(() => this.db.client.order.findUnique({
          where: { id: result.orderId },
          include: { store: { select: { name: true } } },
        }));
        if (!order) return result;

        if (result.status === PaymentStatus.APPROVED) {
          await Promise.all([
            this.notifications.create({
              userId: order.buyerId,
              tenantId: order.tenantId,
              type: NotificationType.PAYMENT_APPROVED,
              title: 'Pago confirmado',
              message: `Tu pago a ${order.store.name} fue aprobado. El vendedor ya puede preparar tu pedido.`,
              href: '/mis-pedidos',
              metadata: { orderId: order.id, total: Number(order.total) },
            }),
            this.notifications.createForVendor(order.tenantId, {
              type: NotificationType.PAYMENT_APPROVED,
              title: 'Pago aprobado',
              message: `El pago de un pedido de ${order.store.name} fue confirmado.`,
              href: '/vendor/pedidos',
              metadata: { orderId: order.id, total: Number(order.total) },
            }),
          ]);
        }

        if (result.status === PaymentStatus.REJECTED || result.status === PaymentStatus.CANCELLED) {
          await this.notifications.create({
            userId: order.buyerId,
            tenantId: order.tenantId,
            type: NotificationType.PAYMENT_FAILED,
            title: 'El pago no se completó',
            message: `El pago del pedido de ${order.store.name} no fue aprobado.`,
            href: '/mis-pedidos',
            metadata: { orderId: order.id },
          });
        }

        return result;
      }
    }, { connection: this.workerConnection as any, concurrency: 10 });
  }

  enqueueMercadoPago(payload: any) {
    const rawId = [payload?.type, payload?.action, payload?.data?.id].filter(Boolean).join('-');
    const jobId = rawId ? rawId.replace(/[^a-zA-Z0-9_-]/g, '_') : undefined;
    return this.queue.add('mercadopago', { payload }, {
      jobId,
      attempts: 6,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: 1_000,
      removeOnFail: 5_000,
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
    await this.connection.quit();
    await this.workerConnection.quit();
  }
}

@Controller('webhooks')
class WebhooksController {
  constructor(private readonly queue: WebhookQueueService, private readonly mp: MercadoPagoService) {}

  @SystemContext()
  @Post('mercadopago')
  async mercadoPago(
    @Body() payload: any,
    @Headers('x-signature') signature: string,
    @Headers('x-request-id') requestId: string,
    @Query('data.id') dataIdQuery?: string,
  ) {
    const dataId = dataIdQuery ?? String(payload?.data?.id ?? '');
    this.mp.validateWebhookSignature(signature, requestId, dataId);
    await this.queue.enqueueMercadoPago(payload);
    return { received: true };
  }
}

@Module({
  imports: [PaymentsModule, NotificationsModule],
  controllers: [WebhooksController],
  providers: [WebhookQueueService],
})
export class WebhooksModule {}
