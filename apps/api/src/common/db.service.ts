import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Prisma, prisma } from '@multiventas/db';
import { TenantContextService, RequestDbContext } from './tenant-context.service';

const TENANT_MODELS = new Set([
  'Store',
  'Product',
  'ProductImage',
  'Order',
  'OrderItem',
  'Payment',
  'OAuthToken',
  'Commission',
  'Review',
  'ProductDeliveryOption',
  'ProductAnalyticsDaily',
  'AuditLog',
]);

@Injectable()
export class DbService implements OnModuleDestroy {
  private static middlewareInstalled = false;

  constructor(private readonly context: TenantContextService) {
    if (!DbService.middlewareInstalled) {
      prisma.$use(async (params: any, next: any) => {
        const ctx = this.context.get();
        const tenantId = ctx?.tenantId;
        if (!tenantId || !params.model || !TENANT_MODELS.has(params.model)) {
          return next(params);
        }

        if (['findMany', 'count', 'aggregate', 'groupBy', 'updateMany', 'deleteMany'].includes(params.action)) {
          params.args ??= {};
          params.args.where = params.args.where
            ? { AND: [params.args.where, { tenantId }] }
            : { tenantId };
        }

        if (params.action === 'create') {
          params.args.data = { ...params.args.data, tenantId };
        }

        if (params.action === 'createMany') {
          const data = Array.isArray(params.args.data) ? params.args.data : [params.args.data];
          params.args.data = data.map((row: Record<string, unknown>) => ({ ...row, tenantId }));
        }

        return next(params);
      });
      DbService.middlewareInstalled = true;
    }
  }

  get client(): Prisma.TransactionClient | typeof prisma {
    return this.context.get()?.tx ?? prisma;
  }

  get requestContext() {
    return this.context.get();
  }

  async runWithContext<T>(
    ctx: Omit<RequestDbContext, 'tx'>,
    work: () => Promise<T>,
  ): Promise<T> {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${ctx.tenantId ?? ''}, true)`;
      await tx.$executeRaw`SELECT set_config('app.user_id', ${ctx.userId ?? ''}, true)`;
      await tx.$executeRaw`SELECT set_config('app.role', ${ctx.role}, true)`;
      await tx.$executeRaw`SELECT set_config('app.public', ${String(ctx.isPublic)}, true)`;
      return this.context.run({ ...ctx, tx }, work);
    }, { maxWait: 5_000, timeout: 30_000 });
  }

  async runSystem<T>(work: () => Promise<T>): Promise<T> {
    return this.runWithContext({ role: 'system', isPublic: false }, work);
  }

  async onModuleDestroy() {
    await prisma.$disconnect();
  }
}
