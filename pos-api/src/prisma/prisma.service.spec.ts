import { MissingTenantContextError } from '../common/errors/missing-tenant-context.error';
import { runWithTenantContext } from '../common/middleware/tenant-scope.middleware';
import { prismaTenantScopeTestUtils } from './tenant-scope.extension';

describe('Prisma tenant scope helpers', () => {
  const context = { tenantId: 'tenant-1', storeId: 'store-1' };
  it('injects tenant/store into read where with AND', () => {
    expect(
      prismaTenantScopeTestUtils.tenantWhere({ isActive: true }, context),
    ).toEqual({ AND: [{ isActive: true }, context] });
  });
  it('injects tenant/store into write data and blocks mismatch', () => {
    expect(
      prismaTenantScopeTestUtils.scopeData({ name: 'Coffee' }, context),
    ).toMatchObject(context);
    expect(() =>
      prismaTenantScopeTestUtils.scopeData(
        { tenantId: 'other', storeId: 'store-1' },
        context,
      ),
    ).toThrow(MissingTenantContextError);
  });
  it('tracks scoped/excluded/productOptionGroup model intent', () => {
    expect(prismaTenantScopeTestUtils.SCOPED_MODELS.has('Category')).toBe(true);
    expect(prismaTenantScopeTestUtils.SCOPED_MODELS.has('Order')).toBe(true);
    expect(prismaTenantScopeTestUtils.SCOPED_MODELS.has('SyncLog')).toBe(true);
    expect(prismaTenantScopeTestUtils.SCOPED_MODELS.has('User')).toBe(false);
    expect(
      prismaTenantScopeTestUtils.BLOCKED_RELATION_MODELS.has(
        'ProductOptionGroup',
      ),
    ).toBe(true);
    expect(
      prismaTenantScopeTestUtils.BLOCKED_RELATION_MODELS.has('OrderItem'),
    ).toBe(true);
    expect(
      prismaTenantScopeTestUtils.BLOCKED_RELATION_MODELS.has('OrderItemOption'),
    ).toBe(true);
  });
  it('allows tests to set async tenant context', () => {
    expect(
      runWithTenantContext({ ...context, role: 'admin' }, () => true),
    ).toBe(true);
  });
});
