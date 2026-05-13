import { Prisma } from '@prisma/client';
import { MissingTenantContextError } from '../common/errors/missing-tenant-context.error';
import { getTenantContext } from '../common/middleware/tenant-scope.middleware';

const SCOPED_MODELS = new Set([
  'Category',
  'Product',
  'OptionGroup',
  'Option',
  'MenuVersion',
  'Order',
  'SyncLog',
]);
const BLOCKED_RELATION_MODELS = new Set([
  'ProductOptionGroup',
  // OrderItem and OrderItemOption do not duplicate tenant/store columns.
  // Access them only through OrdersRepository nested writes/reads after the
  // parent Order has been scoped by tenantId/storeId.
  'OrderItem',
  'OrderItemOption',
]);
const WRITE_ACTIONS = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
]);
const READ_ACTIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

function assertTenantContext() {
  const context = getTenantContext();
  if (!context?.tenantId || !context?.storeId)
    throw new MissingTenantContextError();
  return context;
}

function tenantWhere(
  where: Record<string, unknown> | undefined,
  context: { tenantId: string; storeId: string },
) {
  const scope = { tenantId: context.tenantId, storeId: context.storeId };
  return where && Object.keys(where).length ? { AND: [where, scope] } : scope;
}

function scopeData(
  data: unknown,
  context: { tenantId: string; storeId: string },
): unknown {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map((item) => scopeData(item, context));
  const record = data as Record<string, unknown>;
  if (
    (record.tenantId && record.tenantId !== context.tenantId) ||
    (record.storeId && record.storeId !== context.storeId)
  ) {
    throw new MissingTenantContextError('Tenant context mismatch');
  }
  return { ...record, tenantId: context.tenantId, storeId: context.storeId };
}

function createTenantScopeExtension() {
  return Prisma.defineExtension({
    name: 'tenantScope',
    query: {
      $allModels: {
        async $allOperations({
          model,
          operation,
          args,
          query,
        }: {
          model?: string;
          operation: string;
          args: Record<string, unknown>;
          query: (args: Record<string, unknown>) => Promise<unknown>;
        }) {
          if (!model) return query(args);
          if (BLOCKED_RELATION_MODELS.has(model)) {
            throw new MissingTenantContextError(
              `${model} must be accessed through scoped Product or OptionGroup repositories`,
            );
          }
          if (!SCOPED_MODELS.has(model)) return query(args);
          const context = assertTenantContext();
          const nextArgs = { ...args };
          if (READ_ACTIONS.has(operation)) {
            nextArgs.where = tenantWhere(
              nextArgs.where as Record<string, unknown> | undefined,
              context,
            );
          }
          if (WRITE_ACTIONS.has(operation)) {
            if (nextArgs.data)
              nextArgs.data = scopeData(nextArgs.data, context);
            if (
              operation !== 'create' &&
              operation !== 'createMany' &&
              nextArgs.where
            ) {
              nextArgs.where = tenantWhere(
                nextArgs.where as Record<string, unknown>,
                context,
              );
            }
            if (operation === 'upsert') {
              if (nextArgs.create)
                nextArgs.create = scopeData(nextArgs.create, context);
              if (nextArgs.update)
                nextArgs.update = scopeData(nextArgs.update, context);
            }
          }
          return query(nextArgs);
        },
      },
    },
  });
}

export const tenantScopeExtension = createTenantScopeExtension();

export const prismaTenantScopeTestUtils = {
  tenantWhere,
  scopeData,
  SCOPED_MODELS,
  BLOCKED_RELATION_MODELS,
};
