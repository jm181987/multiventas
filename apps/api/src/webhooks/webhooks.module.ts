import { Body, Controller, Headers, Injectable, Module, OnModuleDestroy, OnModuleInit, Post, Query } from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { PaymentsModule } from '../payments/payments.module';
import { MercadoPagoService } from '../payments/mercado-pago.service';
import { DbService } from '../common/db.service';
import { SystemContext } from '../common/decorators';

@Injectable()
class WebhookQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
  private readonly workerConnection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
  private queue!: Queue;
  private worker!: Worker;

  constructor(private readonly db: DbService, private readonly mp: MercadoPagoService) {}

  onModuleInit() {
    this.queue = new Queue('payment-webhooks', { connection: this.connection as any });
    this.worker = new Worker('payment-webhooks', async (job: Job) => {
      if (job.name === 'mercadopago') {
        return this.db.runSystem(() => this.mp.processWebhookNotification(job.data.payload));
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
  imports: [PaymentsModule],
  controllers: [WebhooksController],
  providers: [WebhookQueueService],
})
export class WebhooksModule {}
