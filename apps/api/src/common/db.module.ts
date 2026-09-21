import { Global, Module } from '@nestjs/common';
import { DbService } from './db.service';
import { TenantContextService } from './tenant-context.service';

@Global()
@Module({
  providers: [TenantContextService, DbService],
  exports: [TenantContextService, DbService],
})
export class DbModule {}
