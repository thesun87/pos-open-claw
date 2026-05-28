import { TablesRepository } from './tables.repository';

type TableFindManyMock = jest.Mock<
  Promise<{ id: string }[]>,
  [Record<string, unknown>?]
>;

type OrderGroupByMock = jest.Mock<
  Promise<{ tableId: string | null; _count: { _all: number } }[]>,
  [Record<string, unknown>?]
>;

type PrismaMock = {
  table: { findMany: TableFindManyMock };
  order: { groupBy: OrderGroupByMock };
};

const tableSelect = {
  id: true,
  areaId: true,
  name: true,
  capacity: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

const tableOrderBy = [{ sortOrder: 'asc' as const }, { name: 'asc' as const }];

const context = {
  tenantId: 'tenant-1',
  storeId: 'store-1',
  role: 'cashier' as const,
};

function setup() {
  const prisma: PrismaMock = {
    table: {
      findMany: jest.fn<
        Promise<{ id: string }[]>,
        [Record<string, unknown>?]
      >(),
    },
    order: {
      groupBy: jest.fn<
        Promise<{ tableId: string | null; _count: { _all: number } }[]>,
        [Record<string, unknown>?]
      >(),
    },
  };
  return {
    prisma,
    repository: new TablesRepository(prisma as never),
  };
}

describe('TablesRepository.list', () => {
  it('scopes findMany by tenantId and storeId from context', async () => {
    const { prisma, repository } = setup();
    prisma.table.findMany.mockResolvedValue([]);

    await repository.list(context);

    expect(prisma.table.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', storeId: 'store-1' },
      select: tableSelect,
      orderBy: tableOrderBy,
    });
  });

  it('includes areaId filter together with tenantId+storeId when provided', async () => {
    const { prisma, repository } = setup();
    prisma.table.findMany.mockResolvedValue([]);

    await repository.list(context, 'area-9');

    expect(prisma.table.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', storeId: 'store-1', areaId: 'area-9' },
      select: tableSelect,
      orderBy: tableOrderBy,
    });
  });
});

describe('TablesRepository.listActiveTableOrderCounts', () => {
  it('returns empty array when there are no active tables and skips order.groupBy', async () => {
    const { prisma, repository } = setup();
    prisma.table.findMany.mockResolvedValue([]);

    const todayStartUtc = new Date('2026-05-24T17:00:00.000Z');
    await expect(
      repository.listActiveTableOrderCounts(context, todayStartUtc),
    ).resolves.toEqual([]);

    expect(prisma.table.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.order.groupBy).not.toHaveBeenCalled();
  });

  it('calls table.findMany with tenantId+storeId scope and order.groupBy with multi-tenant scoped where including void exclusion and day boundary', async () => {
    const { prisma, repository } = setup();
    prisma.table.findMany.mockResolvedValue([{ id: 'tbl-a' }, { id: 'tbl-b' }]);
    prisma.order.groupBy.mockResolvedValue([]);

    const todayStartUtc = new Date('2026-05-24T17:00:00.000Z');
    await repository.listActiveTableOrderCounts(context, todayStartUtc);

    expect(prisma.table.findMany).toHaveBeenCalledWith({
      where: { isActive: true, tenantId: 'tenant-1', storeId: 'store-1' },
      select: { id: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    expect(prisma.order.groupBy).toHaveBeenCalledTimes(1);
    expect(prisma.order.groupBy).toHaveBeenCalledWith({
      by: ['tableId'],
      where: {
        tenantId: 'tenant-1',
        storeId: 'store-1',
        tableId: { in: ['tbl-a', 'tbl-b'] },
        syncedAt: { gte: todayStartUtc },
        voids: { none: {} },
      },
      _count: { _all: true },
    });
  });

  it('maps occupied tables from groupBy results and defaults missing tables to activeOrderCount 0', async () => {
    const { prisma, repository } = setup();
    prisma.table.findMany.mockResolvedValue([
      { id: 'tbl-empty' },
      { id: 'tbl-occupied' },
      { id: 'tbl-also-empty' },
    ]);
    prisma.order.groupBy.mockResolvedValue([
      { tableId: 'tbl-occupied', _count: { _all: 3 } },
      { tableId: null, _count: { _all: 99 } }, // null tableId must be filtered out
    ]);

    const todayStartUtc = new Date('2026-05-24T17:00:00.000Z');
    await expect(
      repository.listActiveTableOrderCounts(context, todayStartUtc),
    ).resolves.toEqual([
      { tableId: 'tbl-empty', activeOrderCount: 0 },
      { tableId: 'tbl-occupied', activeOrderCount: 3 },
      { tableId: 'tbl-also-empty', activeOrderCount: 0 },
    ]);
  });
});
