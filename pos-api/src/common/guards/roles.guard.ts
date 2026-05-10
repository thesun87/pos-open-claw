import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../decorators/tenant-context.decorator';

function normalizeRole(role: unknown): UserRole | undefined {
  if (typeof role !== 'string') return undefined;
  const normalized = role.toLowerCase();
  return normalized === 'admin' || normalized === 'cashier'
    ? normalized
    : undefined;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) return true;
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { role?: string } }>();
    const role = normalizeRole(request.user?.role);
    if (role && requiredRoles.includes(role)) return true;
    throw new ForbiddenException('Insufficient role');
  }
}
