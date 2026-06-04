/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { TableSessionStatus } from '@prisma/client';
import { TableSessionsRepository } from './table-sessions.repository';

const context = {
  tenantId: 'tenant-1',
  storeId: 'store-1',
  role: 'cashier' as const,
};

const sessionRow = {
  id: 'session-1',
  tableId: 'table-1',
  tenantId: 'tenant-1',
  storeId: 'store-1',
  status: TableSessionStatus.open,
  openedByDevice: 'device-001',
  openedAt: new Date('2026-06-04T08:00:00Z'),
  clientSessionId: 'client-session-1',
  createdAt: new Date('2026-06-04T08:00:00Z'),
  updatedAt: new Date('2026-06-04T08:00:00Z'),
};

function setup() {
  const tableSessionMock = {
    create: jest.fn().mockResolvedValue(sessionRow),
    findFirst: jest.fn().mockResolvedValue(sessionRow),
    findMany: jest.fn().mockResolvedValue([sessionRow]),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    groupBy: jest.fn().mockResolvedValue([]),
  };
  const tableMock = {
    findFirst: jest.fn().mockResolvedValue({ id: 'table-1' }),
  };
  const prisma = {
    tableSession: tableSessionMock,
    table: tableMock,
  };
  return {
    prisma,
    repo: new TableSessionsRepository(prisma as never),
  };
}

describe('TableSessionsRepository', () => {
  describe('create', () => {
    it('creates session with uuidv7 id, tenant/store context, status=open', async () => {
      const { prisma, repo } = setup();
      await repo.create(context, {
        tableId: 'table-1',
        clientSessionId: 'client-session-1',
        deviceId: 'device-001',
      });
      expect(prisma.tableSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            storeId: 'store-1',
            tableId: 'table-1',
            clientSessionId: 'client-session-1',
            openedByDevice: 'device-001',
            status: TableSessionStatus.open,
          }),
        }),
      );
      // id should be a string (uuidv7) — extract via known shape
      const firstCall = prisma.tableSession.create.mock.calls[0] as unknown as [
        { data: { id: string } },
      ];
      expect(typeof firstCall[0].data.id).toBe('string');
    });

    it('uses provided openedAt when given', async () => {
      const { prisma, repo } = setup();
      const openedAt = new Date('2026-06-04T10:00:00Z');
      await repo.create(context, {
        tableId: 'table-1',
        clientSessionId: 'client-session-1',
        deviceId: 'device-001',
        openedAt,
      });
      const firstCall = prisma.tableSession.create.mock.calls[0] as unknown as [
        { data: { openedAt: Date } },
      ];
      expect(firstCall[0].data.openedAt).toEqual(openedAt);
    });
  });

  describe('findByClientSessionId', () => {
    it('calls findFirst scoped to tenant/store by clientSessionId', async () => {
      const { prisma, repo } = setup();
      const result = await repo.findByClientSessionId(
        context,
        'client-session-1',
      );
      expect(result).toEqual(sessionRow);
      expect(prisma.tableSession.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clientSessionId: 'client-session-1',
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('calls findFirst scoped to tenant/store by id', async () => {
      const { prisma, repo } = setup();
      const result = await repo.findById(context, 'session-1');
      expect(result).toEqual(sessionRow);
      expect(prisma.tableSession.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'session-1' }),
        }),
      );
    });

    it('returns null when not found', async () => {
      const { prisma, repo } = setup();
      prisma.tableSession.findFirst.mockResolvedValue(null);
      const result = await repo.findById(context, 'missing');
      expect(result).toBeNull();
    });
  });

  describe('listOpen', () => {
    it('queries for open sessions scoped to tenant/store', async () => {
      const { prisma, repo } = setup();
      const result = await repo.listOpen(context);
      expect(result).toEqual([sessionRow]);
      expect(prisma.tableSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            storeId: 'store-1',
            status: TableSessionStatus.open,
          }),
        }),
      );
    });
  });

  describe('settle', () => {
    it('updates status to settled and re-fetches session', async () => {
      const { prisma, repo } = setup();
      const settled = { ...sessionRow, status: TableSessionStatus.settled };
      prisma.tableSession.findFirst.mockResolvedValue(settled);
      const result = await repo.settle(context, 'session-1');
      expect(prisma.tableSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: TableSessionStatus.settled },
        }),
      );
      expect(result?.status).toBe(TableSessionStatus.settled);
    });

    it('returns null when updateMany count is 0 (not found / cross-store)', async () => {
      const { prisma, repo } = setup();
      prisma.tableSession.updateMany.mockResolvedValue({ count: 0 });
      const result = await repo.settle(context, 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('tableExists', () => {
    it('calls table.findFirst scoped by id', async () => {
      const { prisma, repo } = setup();
      const result = await repo.tableExists(context, 'table-1');
      expect(result).toEqual({ id: 'table-1' });
      expect(prisma.table.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'table-1' }),
        }),
      );
    });

    it('returns null for non-existent or cross-store table', async () => {
      const { prisma, repo } = setup();
      prisma.table.findFirst.mockResolvedValue(null);
      const result = await repo.tableExists(context, 'foreign-table');
      expect(result).toBeNull();
    });
  });

  describe('countOpenSessionsByTable', () => {
    it('returns empty array when no tableIds provided', async () => {
      const { repo } = setup();
      const result = await repo.countOpenSessionsByTable(context, []);
      expect(result).toEqual([]);
    });

    it('groups by tableId and maps open session counts', async () => {
      const { prisma, repo } = setup();
      prisma.tableSession.groupBy.mockResolvedValue([
        { tableId: 'table-1', _count: { _all: 2 } },
      ]);
      const result = await repo.countOpenSessionsByTable(context, [
        'table-1',
        'table-2',
      ]);
      expect(result).toEqual([
        { tableId: 'table-1', openSessionCount: 2 },
        { tableId: 'table-2', openSessionCount: 0 },
      ]);
      expect(prisma.tableSession.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['tableId'],
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            storeId: 'store-1',
            tableId: { in: ['table-1', 'table-2'] },
            status: TableSessionStatus.open,
          }),
        }),
      );
    });

    it('returns 0 for tables with no open sessions', async () => {
      const { prisma, repo } = setup();
      prisma.tableSession.groupBy.mockResolvedValue([]);
      const result = await repo.countOpenSessionsByTable(context, ['table-1']);
      expect(result).toEqual([{ tableId: 'table-1', openSessionCount: 0 }]);
    });
  });
});
