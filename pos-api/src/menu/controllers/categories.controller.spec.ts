import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { CategoriesController } from './categories.controller';

describe('CategoriesController', () => {
  const service = {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const controller = new CategoriesController(service as never);
  const reflector = new Reflector();
  it('delegates list with tenant context', async () => {
    const ctx = { tenantId: 't1', storeId: 's1' };
    service.list.mockResolvedValue([]);
    await controller.list(ctx);
    expect(service.list).toHaveBeenCalledWith(ctx);
  });
  it('has cashier/admin roles for list', () => {
    expect(
      reflector.get(
        ROLES_KEY,
        Reflect.get(CategoriesController.prototype, 'list'),
      ),
    ).toEqual(['cashier', 'admin']);
  });
  it('has admin-only roles for mutations, so cashier mutation attempts are forbidden by RolesGuard', () => {
    expect(
      reflector.get(
        ROLES_KEY,
        Reflect.get(CategoriesController.prototype, 'create'),
      ),
    ).toEqual(['admin']);
    expect(
      reflector.get(
        ROLES_KEY,
        Reflect.get(CategoriesController.prototype, 'update'),
      ),
    ).toEqual(['admin']);
    expect(
      reflector.get(
        ROLES_KEY,
        Reflect.get(CategoriesController.prototype, 'delete'),
      ),
    ).toEqual(['admin']);
  });
  it('delegates create/update/delete', async () => {
    const ctx = { tenantId: 't1', storeId: 's1' };
    await controller.create(ctx, { name: 'A', sortOrder: 0 });
    await controller.update(ctx, 'c1', { name: 'B' });
    await controller.delete(ctx, 'c1');
    expect(service.create).toHaveBeenCalled();
    expect(service.update).toHaveBeenCalled();
    expect(service.delete).toHaveBeenCalled();
  });
});
