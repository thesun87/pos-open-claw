import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type UserRole = 'admin' | 'cashier';

export interface TenantContext {
  tenantId: string;
  storeId: string;
  userId?: string;
  role?: UserRole;
}

export const TenantContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ tenantContext?: TenantContext }>();
    return request.tenantContext;
  },
);
