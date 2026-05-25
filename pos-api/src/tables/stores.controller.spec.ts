import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { StoresController } from './stores.controller';
import { StoresRepository } from './stores.repository';
import { StoresService } from './stores.service';

const context = { tenantId: 't1', storeId: 's1', role: 'cashier' as const };

describe('StoresController', () => {
  it('delegates GET /stores/me with cashier/admin roles', async () => {
    const service = {
      getCurrentStore: jest.fn().mockResolvedValue({ id: 's1' }),
    };
    const controller = new StoresController(service as never);
    await expect(controller.getMe(context)).resolves.toEqual({ id: 's1' });
    expect(service.getCurrentStore).toHaveBeenCalledWith(context);
    expect(
      new Reflector().get(
        ROLES_KEY,
        Reflect.get(StoresController.prototype, 'getMe'),
      ),
    ).toEqual(['cashier', 'admin']);
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
    await expect(service.getCurrentStore(context)).resolves.toEqual(store);
    expect(repo.findCurrentStore).toHaveBeenCalledWith(context);
  });

  it('rejects missing context with Problem Details body', async () => {
    const service = new StoresService({} as never);
    await expect(service.getCurrentStore(undefined)).rejects.toMatchObject({
      response: { type: expect.stringContaining('forbidden') as unknown },
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

    await expect(repo.findCurrentStore(context)).resolves.toEqual(store);
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
});
