import { Injectable } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import { runWithTenantContext } from '../common/middleware/tenant-scope.middleware';
import { tenantScopeExtension } from '../prisma/tenant-scope.extension';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

export type TableStatusCountRecord = {
  tableId: string;
  activeOrderCount: number;
};

export type TableRecord = {
  id: string;
  areaId: string;
  name: string;
  capacity: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type ScopedPrismaClient = PrismaService & {
  area: PrismaService['area'];
  table: PrismaService['table'];
  order: PrismaService['order'];
};
export type TransactionClient = Parameters<
  Parameters<PrismaService['$transaction']>[0]
>[0];

type PrismaClientLike = ScopedPrismaClient | TransactionClient;

function tenantScopedClient(client: PrismaClientLike): ScopedPrismaClient {
  if ('$extends' in client && typeof client.$extends === 'function') {
    return client.$extends(tenantScopeExtension) as ScopedPrismaClient;
  }
  return client as ScopedPrismaClient;
}

const selectTable = {
  id: true,
  areaId: true,
  name: true,
  capacity: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class TablesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(context: TenantContext, areaId?: string): Promise<TableRecord[]> {
    return runWithTenantContext(context, () =>
      this.prisma.table.findMany({
        where: {
          tenantId: context.tenantId,
          storeId: context.storeId,
          ...(areaId ? { areaId } : {}),
        },
        select: selectTable,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    );
  }

  findById(
    context: TenantContext,
    id: string,
    client: PrismaClientLike = this.prisma,
  ) {
    return runWithTenantContext(context, () =>
      tenantScopedClient(client).table.findFirst({
        where: { id },
        select: selectTable,
      }),
    );
  }

  areaExists(
    context: TenantContext,
    areaId: string,
    client: PrismaClientLike = this.prisma,
  ) {
    return runWithTenantContext(context, () =>
      tenantScopedClient(client).area.findFirst({
        where: { id: areaId },
        select: { id: true },
      }),
    );
  }

  create(
    context: TenantContext,
    dto: CreateTableDto,
    client: PrismaClientLike,
  ) {
    return runWithTenantContext(context, () =>
      tenantScopedClient(client).table.create({
        data: {
          id: uuidv7(),
          tenantId: context.tenantId,
          storeId: context.storeId,
          areaId: dto.areaId,
          name: dto.name,
          capacity: dto.capacity ?? 2,
          sortOrder: dto.sortOrder ?? 0,
          ...(dto.isActive === undefined ? {} : { isActive: dto.isActive }),
        },
        select: selectTable,
      }),
    );
  }

  update(
    context: TenantContext,
    id: string,
    dto: UpdateTableDto,
    client: PrismaClientLike,
  ) {
    return runWithTenantContext(context, async () => {
      const result = await tenantScopedClient(client).table.updateMany({
        where: { id },
        data: dto,
      });
      if (result.count !== 1) return null;
      return tenantScopedClient(client).table.findFirst({
        where: { id },
        select: selectTable,
      });
    });
  }

  delete(context: TenantContext, id: string, client: PrismaClientLike) {
    return runWithTenantContext(context, async () => {
      const existing = await tenantScopedClient(client).table.findFirst({
        where: { id },
        select: selectTable,
      });
      if (!existing) return null;
      await tenantScopedClient(client).table.deleteMany({ where: { id } });
      return existing;
    });
  }

  listActiveTableOrderCounts(
    context: TenantContext,
    todayStartUtc: Date,
  ): Promise<TableStatusCountRecord[]> {
    return runWithTenantContext(context, async () => {
      const tables = await this.prisma.table.findMany({
        where: {
          isActive: true,
          tenantId: context.tenantId,
          storeId: context.storeId,
        },
        select: { id: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
      const tableIds = tables.map((table) => table.id);
      if (tableIds.length === 0) return [];
      const counts = await this.prisma.order.groupBy({
        by: ['tableId'],
        where: {
          tenantId: context.tenantId,
          storeId: context.storeId,
          tableId: { in: tableIds },
          syncedAt: { gte: todayStartUtc },
          voids: { none: {} },
        },
        _count: { _all: true },
      });
      const countByTableId = new Map(
        counts
          .filter((count) => count.tableId !== null)
          .map((count) => [count.tableId!, count._count._all]),
      );
      return tables.map((table) => ({
        tableId: table.id,
        activeOrderCount: countByTableId.get(table.id) ?? 0,
      }));
    });
  }

  countActiveOrdersForToday(
    context: TenantContext,
    tableId: string,
    todayStartUtc: Date,
    client: PrismaClientLike,
  ) {
    return runWithTenantContext(context, () =>
      tenantScopedClient(client).order.count({
        where: {
          tableId,
          syncedAt: { gte: todayStartUtc },
          voids: { none: {} },
        },
      }),
    );
  }
}
