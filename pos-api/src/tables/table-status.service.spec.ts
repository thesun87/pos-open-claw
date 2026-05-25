import {
  TableStatusService,
  startOfTodayHoChiMinhUtc,
} from './table-status.service';
import { TablesRepository } from './tables.repository';

const context = { tenantId: 't1', storeId: 's1', role: 'cashier' as const };

describe('TableStatusService', () => {
  it('maps empty and occupied statuses from aggregate counts', async () => {
    const repo = {
      listActiveTableOrderCounts: jest.fn().mockResolvedValue([
        { tableId: 'tbl-empty', activeOrderCount: 0 },
        { tableId: 'tbl-occupied', activeOrderCount: 2 },
      ]),
    };
    const service = new TableStatusService(repo as never);
    await expect(service.listStatus(context)).resolves.toEqual([
      { tableId: 'tbl-empty', activeOrderCount: 0, status: 'empty' },
      { tableId: 'tbl-occupied', activeOrderCount: 2, status: 'occupied' },
    ]);
    expect(repo.listActiveTableOrderCounts).toHaveBeenCalledWith(
      context,
      expect.any(Date),
    );
  });

  it('uses Asia/Ho_Chi_Minh day boundary converted to UTC', () => {
    expect(
      startOfTodayHoChiMinhUtc(new Date('2026-05-25T22:44:00.000+07:00')),
    ).toEqual(new Date('2026-05-24T17:00:00.000Z'));
  });

  it('rejects missing context with Problem Details body', async () => {
    const service = new TableStatusService({} as never);
    await expect(service.listStatus(undefined)).rejects.toMatchObject({
      response: { type: expect.stringContaining('forbidden') as unknown },
    });
  });
});

describe('TablesRepository.listActiveTableOrderCounts', () => {
  it('uses active tables and aggregate order counts scoped by tenant/store/day without N+1', async () => {
    const tableFindMany = jest
      .fn()
      .mockResolvedValue([{ id: 'tbl-empty' }, { id: 'tbl-occupied' }]);
    const orderGroupBy = jest.fn().mockResolvedValue([
      { tableId: 'tbl-occupied', _count: { _all: 2 } },
      { tableId: null, _count: { _all: 99 } },
    ]);
    const repo = new TablesRepository({
      table: { findMany: tableFindMany },
      order: { groupBy: orderGroupBy },
    } as never);
    const todayStartUtc = new Date('2026-05-24T17:00:00.000Z');

    await expect(
      repo.listActiveTableOrderCounts(context, todayStartUtc),
    ).resolves.toEqual([
      { tableId: 'tbl-empty', activeOrderCount: 0 },
      { tableId: 'tbl-occupied', activeOrderCount: 2 },
    ]);
    expect(tableFindMany).toHaveBeenCalledWith({
      where: { isActive: true, tenantId: 't1', storeId: 's1' },
      select: { id: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    expect(orderGroupBy).toHaveBeenCalledTimes(1);
    expect(orderGroupBy).toHaveBeenCalledWith({
      by: ['tableId'],
      where: {
        tenantId: 't1',
        storeId: 's1',
        tableId: { in: ['tbl-empty', 'tbl-occupied'] },
        syncedAt: { gte: todayStartUtc },
        voids: { none: {} },
      },
      _count: { _all: true },
    });
  });

  it('skips order aggregate when there are no active tables', async () => {
    const orderGroupBy = jest.fn();
    const repo = new TablesRepository({
      table: { findMany: jest.fn().mockResolvedValue([]) },
      order: { groupBy: orderGroupBy },
    } as never);

    await expect(
      repo.listActiveTableOrderCounts(context, new Date()),
    ).resolves.toEqual([]);
    expect(orderGroupBy).not.toHaveBeenCalled();
  });
});
