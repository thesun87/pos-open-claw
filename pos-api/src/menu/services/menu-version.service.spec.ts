import { MenuVersionService } from './menu-version.service';

type UpsertArgs = {
  where: { tenantId_storeId: { tenantId: string; storeId: string } };
};

describe('MenuVersionService', () => {
  it('upserts initial version and increments consecutively', async () => {
    const versions = new Map<string, number>();
    const client = {
      menuVersion: {
        upsert: jest.fn(({ where }: UpsertArgs) => {
          const key = `${where.tenantId_storeId.tenantId}:${where.tenantId_storeId.storeId}`;
          const next = (versions.get(key) ?? 0) + 1;
          versions.set(key, next);
          return Promise.resolve({ version: next });
        }),
      },
    };
    const service = new MenuVersionService();
    await expect(
      service.bumpMenuVersion('t1', 's1', client as never),
    ).resolves.toBe(1);
    await expect(
      service.bumpMenuVersion('t1', 's1', client as never),
    ).resolves.toBe(2);
    await expect(
      service.bumpMenuVersion('t1', 's1', client as never),
    ).resolves.toBe(3);
  });
});
