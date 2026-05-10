import { Injectable, NestMiddleware } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { NextFunction, Request, Response } from 'express';
import { TenantContext } from '../decorators/tenant-context.decorator';

const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext | undefined {
  return tenantContextStorage.getStore();
}

export function runWithTenantContext<T>(
  context: TenantContext,
  callback: () => T,
): T {
  return tenantContextStorage.run(context, callback);
}

@Injectable()
export class TenantScopeMiddleware implements NestMiddleware {
  use(
    req: Request & {
      tenantContext?: TenantContext;
      user?: Partial<TenantContext> & { sub?: string };
    },
    _res: Response,
    next: NextFunction,
  ): void {
    const candidate =
      req.tenantContext ??
      (req.user?.tenantId && req.user?.storeId
        ? {
            tenantId: req.user.tenantId,
            storeId: req.user.storeId,
            userId: req.user.userId ?? req.user.sub,
            role: req.user.role,
          }
        : undefined);
    if (candidate) {
      runWithTenantContext(candidate as TenantContext, next);
      return;
    }
    next();
  }
}
