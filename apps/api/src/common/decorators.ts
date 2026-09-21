import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { UserRole } from '@multiventas/db';

export const ROLES_KEY = 'roles';
export const SYSTEM_CONTEXT_KEY = 'system-context';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
export const SystemContext = () => SetMetadata(SYSTEM_CONTEXT_KEY, true);

export type AuthUser = {
  sub: string;
  email: string;
  roles: UserRole[];
  tenantId?: string;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);
