import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { createPrismaClientOptions } from '../src/prisma/prisma-client-options';

const prisma = new PrismaClient(createPrismaClientOptions());

const TENANT_ID = '018f0000-0000-7000-8000-000000000001';
const COUNTER_STORE_ID = '018f0000-0000-7000-8000-000000000002';
const TABLE_STORE_ID = '018f0000-0000-7000-8000-000000000006';

describe('Seed table-mode data (e2e)', () => {
  beforeAll(() => {
    execFileSync('npm', ['run', 'seed'], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'pipe',
    });
  }, 120_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('seeds counter store without table-mode data and table store with 2 areas / 8 tables', async () => {
    const [counterStore, tableStore, counterTables, tableAreas, tableTables] =
      await Promise.all([
        prisma.store.findUniqueOrThrow({ where: { id: COUNTER_STORE_ID } }),
        prisma.store.findUniqueOrThrow({ where: { id: TABLE_STORE_ID } }),
        prisma.table.count({
          where: { tenantId: TENANT_ID, storeId: COUNTER_STORE_ID },
        }),
        prisma.area.findMany({
          where: { tenantId: TENANT_ID, storeId: TABLE_STORE_ID },
        }),
        prisma.table.findMany({
          where: { tenantId: TENANT_ID, storeId: TABLE_STORE_ID },
        }),
      ]);

    expect(counterStore.tableMode).toBe(false);
    expect(tableStore.tableMode).toBe(true);
    expect(counterTables).toBe(0);
    expect(tableAreas.map((area) => area.name).sort()).toEqual([
      'Quầy chính',
      'Sân ngoài',
    ]);
    expect(tableTables).toHaveLength(8);
    expect(tableTables.every((table) => table.isActive)).toBe(true);
    expect(
      tableTables.every((table) => table.capacity >= 2 && table.capacity <= 4),
    ).toBe(true);
  });

  it('seeds table orders with table snapshot while preserving old counter orders as nullable', async () => {
    const [tableOrders, counterOrderWithTableCount] = await Promise.all([
      prisma.order.findMany({
        where: {
          tenantId: TENANT_ID,
          storeId: TABLE_STORE_ID,
          tableId: { not: null },
        },
        include: { table: true },
      }),
      prisma.order.count({
        where: {
          tenantId: TENANT_ID,
          storeId: COUNTER_STORE_ID,
          tableId: { not: null },
        },
      }),
    ]);

    expect(tableOrders).toHaveLength(3);
    expect(counterOrderWithTableCount).toBe(0);
    expect(
      tableOrders.every(
        (order) =>
          order.tableId && order.tableNameSnapshot === order.table?.name,
      ),
    ).toBe(true);
  });
});
