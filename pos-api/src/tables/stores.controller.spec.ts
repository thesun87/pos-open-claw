import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { StoresController } from './stores.controller';
import { StoresRepository } from './stores.repository';
import { StoresService } from './stores.service';

const cashierContext = {
  tenantId: 't1',
  storeId: 's1',
  role: 'cashier' as const,
};
const adminContext = { tenantId: 't1', storeId: 's1', role: 'admin' as const };

describe('StoresController', () => {
  it('delegates GET /stores/me with cashier/admin roles', async () => {
    const service = {
      getCurrentStore: jest.fn().mockResolvedValue({ id: 's1' }),
    };
    const controller = new StoresController(service as never);
    await expect(controller.getMe(cashierContext)).resolves.toEqual({
      id: 's1',
    });
    expect(service.getCurrentStore).toHaveBeenCalledWith(cashierContext);
    expect(
      new Reflector().get(
        ROLES_KEY,
        Reflect.get(StoresController.prototype, 'getMe'),
      ),
    ).toEqual(['cashier', 'admin']);
  });

  it('delegates PATCH /stores/me with admin role only', async () => {
    const service = {
      updateCurrentStoreTableMode: jest.fn().mockResolvedValue({ id: 's1' }),
    };
    const controller = new StoresController(service as never);
    await expect(
      controller.updateMe(adminContext, { tableMode: true }),
    ).resolves.toEqual({ id: 's1' });
    expect(service.updateCurrentStoreTableMode).toHaveBeenCalledWith(
      adminContext,
      true,
    );
    expect(
      new Reflector().get(
        ROLES_KEY,
        Reflect.get(StoresController.prototype, 'updateMe'),
      ),
    ).toEqual(['admin']);
  });
});

describe('StoresService', () => {
  it('returns scoped current store without tenantId', async () => {
    const store = {
      id: 's1',
      name: 'Cafe',
      code: 'CF',
      tableMode: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const repo = { findCurrentStore: jest.fn().mockResolvedValue(store) };
    const service = new StoresService(repo as never);
    await expect(service.getCurrentStore(cashierContext)).resolves.toEqual(
      store,
    );
    expect(repo.findCurrentStore).toHaveBeenCalledWith(cashierContext);
  });

  it('rejects missing context with Problem Details body', async () => {
    const service = new StoresService({} as never);
    await expect(service.getCurrentStore(undefined)).rejects.toMatchObject({
      response: { type: expect.stringContaining('forbidden') as unknown },
    });
  });

  it('updates current store tableMode through repository', async () => {
    const store = {
      id: 's1',
      name: 'Cafe',
      code: 'CF',
      tableMode: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const repo = {
      updateCurrentStoreTableMode: jest.fn().mockResolvedValue(store),
    };
    const service = new StoresService(repo as never);
    await expect(
      service.updateCurrentStoreTableMode(adminContext, false),
    ).resolves.toEqual(store);
    expect(repo.updateCurrentStoreTableMode).toHaveBeenCalledWith(
      adminContext,
      false,
    );
  });

  it('rejects update when tenant context is missing', async () => {
    const service = new StoresService({} as never);
    await expect(
      service.updateCurrentStoreTableMode(undefined, true),
    ).rejects.toMatchObject({
      response: { type: expect.stringContaining('forbidden') as unknown },
    });
  });

  it('returns not found when update does not match a store', async () => {
    const repo = {
      updateCurrentStoreTableMode: jest.fn().mockResolvedValue(null),
    };
    const service = new StoresService(repo as never);
    await expect(
      service.updateCurrentStoreTableMode(adminContext, true),
    ).rejects.toMatchObject({
      response: { type: expect.stringContaining('not-found') as unknown },
    });
  });
});

describe('StoresRepository', () => {
  it('selects scoped current store fields without tenantId', async () => {
    const store = {
      id: 's1',
      name: 'Cafe',
      code: 'CF',
      tableMode: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const findFirst = jest.fn<Promise<typeof store>, [unknown]>(() =>
      Promise.resolve(store),
    );
    const repo = new StoresRepository({ store: { findFirst } } as never);

    await expect(repo.findCurrentStore(cashierContext)).resolves.toEqual(store);
    const call = findFirst.mock.calls[0]?.[0] as {
      where: { id: string; tenantId: string };
      select: Record<string, boolean>;
    };
    expect(call.where).toEqual({ id: 's1', tenantId: 't1' });
    expect(call.select).toEqual({
      id: true,
      name: true,
      code: true,
      tableMode: true,
      createdAt: true,
      updatedAt: true,
    });
  });

  it('updates scoped tableMode then selects current store shape', async () => {
    const store = {
      id: 's1',
      name: 'Cafe',
      code: 'CF',
      tableMode: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const updateMany = jest.fn<Promise<{ count: number }>, [unknown]>(() =>
      Promise.resolve({ count: 1 }),
    );
    const findFirst = jest.fn<Promise<typeof store>, [unknown]>(() =>
      Promise.resolve(store),
    );
    const repo = new StoresRepository({
      store: { updateMany, findFirst },
    } as never);

    await expect(
      repo.updateCurrentStoreTableMode(adminContext, false),
    ).resolves.toEqual(store);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 's1', tenantId: 't1' },
      data: { tableMode: false },
    });
    const selectCall = findFirst.mock.calls[0]?.[0] as {
      where: { id: string; tenantId: string };
      select: Record<string, boolean>;
    };
    expect(selectCall.where).toEqual({ id: 's1', tenantId: 't1' });
    expect(selectCall.select).not.toHaveProperty('tenantId');
  });

  it('returns null when scoped update matches no store', async () => {
    const updateMany = jest.fn<Promise<{ count: number }>, [unknown]>(() =>
      Promise.resolve({ count: 0 }),
    );
    const findFirst = jest.fn();
    const repo = new StoresRepository({
      store: { updateMany, findFirst },
    } as never);

    await expect(
      repo.updateCurrentStoreTableMode(adminContext, true),
    ).resolves.toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });
});
