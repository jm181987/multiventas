import { Controller, Get, Module, ServiceUnavailableException } from '@nestjs/common';
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
    const [schema] = await this.db.client.$queryRaw<Array<{ users: string | null; migrations: string | null }>>`
      SELECT
        to_regclass('public.users')::text AS users,
        to_regclass('public._prisma_migrations')::text AS migrations
    `;

    if (!schema?.users || !schema?.migrations) {
      throw new ServiceUnavailableException('Base de datos conectada pero esquema/migraciones no están listos');
    }

    return {
      status: 'ok',
      database: 'ok',
      schema: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
