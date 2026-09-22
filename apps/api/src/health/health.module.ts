import { Controller, Get, Module, ServiceUnavailableException } from '@nestjs/common';
import { DbService } from '../common/db.service';
import { SkipTenantContext } from '../common/decorators';

const REQUIRED_MIGRATION = '202609220008_reassert_jorgitom_admin';

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

    const [migration] = await this.db.client.$queryRaw<Array<{ applied: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM "_prisma_migrations"
        WHERE "migration_name" = ${REQUIRED_MIGRATION}
          AND "finished_at" IS NOT NULL
          AND "rolled_back_at" IS NULL
      ) AS applied
    `;

    if (!migration?.applied) {
      throw new ServiceUnavailableException('Esperando actualización del administrador principal');
    }

    return {
      status: 'ok',
      database: 'ok',
      schema: 'ok',
      migration: REQUIRED_MIGRATION,
      timestamp: new Date().toISOString(),
    };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
