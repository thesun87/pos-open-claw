import { ForbiddenException } from '@nestjs/common';
import { MenuSyncController } from './menu-sync.controller';
import { MenuService } from './menu.service';

describe('MenuSyncController', () => {
  it('delegates menu snapshot lookup using tenant context', async () => {
    const snapshot = {
      menuVersion: 1,
      categories: [],
      products: [],
      optionGroups: [],
    };
    const getMenuSnapshot = jest.fn().mockResolvedValue(snapshot);
    const service = { getMenuSnapshot } as unknown as MenuService;
    const context = {
      tenantId: 'tenant-1',
      storeId: 'store-1',
      role: 'admin' as const,
    };

    await expect(
      new MenuSyncController(service).getMenu(context),
    ).resolves.toBe(snapshot);
    expect(getMenuSnapshot).toHaveBeenCalledTimes(1);
    expect(getMenuSnapshot).toHaveBeenCalledWith(context);
  });

  it('rejects requests without tenant context', async () => {
    const service = { getMenuSnapshot: jest.fn() } as unknown as MenuService;
    await expect(
      new MenuSyncController(service).getMenu(undefined),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
