import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { MenuSyncQueryDto } from './dto/menu-sync-query.dto';
import { MenuSyncController } from './menu-sync.controller';
import { MenuService } from './menu.service';

describe('MenuSyncController', () => {
  it('delegates versioned menu lookup using tenant context and query', async () => {
    const response = {
      menuVersion: 1,
      hasChanges: false as const,
      snapshot: null,
    };
    const getVersionedMenu = jest.fn().mockResolvedValue(response);
    const service = { getVersionedMenu } as unknown as MenuService;
    const context = {
      tenantId: 'tenant-1',
      storeId: 'store-1',
      role: 'admin' as const,
    };
    const query = { since_version: 1, include_inactive: true };

    await expect(
      new MenuSyncController(service).getMenu(context, query),
    ).resolves.toBe(response);
    expect(getVersionedMenu).toHaveBeenCalledTimes(1);
    expect(getVersionedMenu).toHaveBeenCalledWith(context, query);
  });

  it('rejects requests without tenant context', async () => {
    const service = { getVersionedMenu: jest.fn() } as unknown as MenuService;
    await expect(
      new MenuSyncController(service).getMenu(undefined, {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([undefined, null, '', '0', '12'])(
    'accepts valid since_version query value %p',
    async (value) => {
      const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });

      await expect(
        pipe.transform(
          { since_version: value },
          { type: 'query', metatype: MenuSyncQueryDto },
        ),
      ).resolves.toEqual(
        value === undefined || value === null || value === ''
          ? {}
          : { since_version: Number(value) },
      );
    },
  );

  it.each(['abc', '1.2', '-1'])(
    'rejects invalid since_version query value %p',
    async (value) => {
      const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });

      await expect(
        pipe.transform(
          { since_version: value },
          { type: 'query', metatype: MenuSyncQueryDto },
        ),
      ).rejects.toThrow();
    },
  );

  it.each([
    ['true', true],
    ['false', false],
    [true, true],
    [false, false],
  ])(
    'parses include_inactive boolean query value %p',
    async (value, expected) => {
      const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });

      await expect(
        pipe.transform(
          { include_inactive: value },
          { type: 'query', metatype: MenuSyncQueryDto },
        ),
      ).resolves.toEqual({ include_inactive: expected });
    },
  );

  it('rejects invalid include_inactive boolean query value', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    await expect(
      pipe.transform(
        { include_inactive: 'yes' },
        { type: 'query', metatype: MenuSyncQueryDto },
      ),
    ).rejects.toThrow();
  });
});
