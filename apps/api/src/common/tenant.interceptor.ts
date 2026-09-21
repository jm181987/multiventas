import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { from, lastValueFrom, Observable } from 'rxjs';
import { DbService } from './db.service';
import { SKIP_TENANT_CONTEXT_KEY, SYSTEM_CONTEXT_KEY, AuthUser } from './decorators';
import { UserRole } from '@multiventas/db';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly db: DbService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skipTenantContext = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_CONTEXT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipTenantContext) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthUser | undefined;
    const system = this.reflector.getAllAndOverride<boolean>(SYSTEM_CONTEXT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const role = system
      ? 'system'
      : user?.roles?.includes(UserRole.ADMIN)
        ? 'admin'
        : user?.tenantId
          ? 'vendor'
          : user
            ? 'buyer'
            : 'public';

    return from(this.db.runWithContext({
      tenantId: system ? undefined : user?.tenantId,
      userId: user?.sub,
      role,
      isPublic: !system && !user?.tenantId && !user?.roles?.includes(UserRole.ADMIN),
    }, async () => lastValueFrom(next.handle())));
  }
}
