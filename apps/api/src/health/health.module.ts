import { Controller, Get, Module } from '@nestjs/common';
import { DbService } from '../common/db.service';
import { SkipTenantContext } from '../common/decorators';

@SkipTenantContext()
@Controller('health')
class HealthController {
  constructor(private readonly db: DbService) {}

  @Get()
  live() {
    return { status: 'ok', service: 'api', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async ready() {
    await this.db.client.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'ok', timestamp: new Date().toISOString() };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
