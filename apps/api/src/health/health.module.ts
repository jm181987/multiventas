import { Controller, Get, Module } from '@nestjs/common';
import { DbService } from '../common/db.service';

@Controller('health')
class HealthController {
  constructor(private readonly db: DbService) {}

  @Get()
  async health() {
    await this.db.client.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'ok', timestamp: new Date().toISOString() };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
