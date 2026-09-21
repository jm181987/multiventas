import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Prisma } from '@multiventas/db';

export type RequestDbContext = {
  tenantId?: string;
  userId?: string;
  role: 'public' | 'buyer' | 'vendor' | 'admin' | 'system';
  isPublic: boolean;
  tx?: Prisma.TransactionClient;
};

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<RequestDbContext>();

  get(): RequestDbContext | undefined {
    return this.storage.getStore();
  }

  run<T>(ctx: RequestDbContext, work: () => Promise<T>): Promise<T> {
    return this.storage.run(ctx, work);
  }
}
