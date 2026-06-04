import { Injectable } from '@nestjs/common';
import { TableSessionStatus } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import { runWithTenantContext } from '../common/middleware/tenant-scope.middleware';
import { PrismaService } from '../prisma/prisma.service';

export type TableSessionRecord = {
  id: string;
  tableId: string;
  tenantId: string;
  storeId: string;
  status: TableSessionStatus;
  openedByDevice: string;
  openedAt: Date;
  clientSessionId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type OpenSessionCountRecord = {
  tableId: string;
  openSessionCount: number;
};

export type TransactionClient = Parameters<
  Parameters<PrismaService['$transaction']>[0]
>[0];

type PrismaClientLike = PrismaService | TransactionClient;

const selectSession = {
  id: true,
  tableId: true,
  tenantId: true,
  storeId: true,
  status: true,
  openedByDevice: true,
  openedAt: true,
  clientSessionId: true,
  createdAt: true,
  updatedAt: true,
} as const;

function clientOf(client: PrismaClientLike) {
  return client as PrismaService;
}

@Injectable()
export class TableSessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    context: TenantContext,
    dto: {
      tableId: string;
      clientSessionId: string;
      deviceId: string;
      openedAt?: Date;
    },
    client: PrismaClientLike = this.prisma,
  ): Promise<TableSessionRecord> {
    // NOTE: Manual tenant scoping — NOT using tenantScopeExtension to avoid
    // AsyncLocalStorage context propagation issues with Prisma v7 extension runtime.
    return clientOf(client).tableSession.create({
      data: {
        id: uuidv7(),
        tenantId: context.tenantId,
        storeId: context.storeId,
        tableId: dto.tableId,
        openedByDevice: dto.deviceId,
        status: TableSessionStatus.open,
        openedAt: dto.openedAt ?? new Date(),
        clientSessionId: dto.clientSessionId,
      },
      select: selectSession,
    });
  }

  findByClientSessionId(
    context: TenantContext,
    clientSessionId: string,
    client: PrismaClientLike = this.prisma,
  ): Promise<TableSessionRecord | null> {
    return clientOf(client).tableSession.findFirst({
      where: {
        tenantId: context.tenantId,
        storeId: context.storeId,
        clientSessionId,
      },
      select: selectSession,
    });
  }

  findById(
    context: TenantContext,
    id: string,
    client: PrismaClientLike = this.prisma,
  ): Promise<TableSessionRecord | null> {
    return clientOf(client).tableSession.findFirst({
      where: {
        id,
        tenantId: context.tenantId,
        storeId: context.storeId,
      },
      select: selectSession,
    });
  }

  listOpen(
    context: TenantContext,
    status: string = 'open',
  ): Promise<TableSessionRecord[]> {
    return this.prisma.tableSession.findMany({
      where: {
        tenantId: context.tenantId,
        storeId: context.storeId,
        status: status as TableSessionStatus,
      },
      select: selectSession,
      orderBy: { openedAt: 'asc' },
    });
  }

  async settle(
    context: TenantContext,
    id: string,
    client: PrismaClientLike = this.prisma,
  ): Promise<TableSessionRecord | null> {
    const result = await clientOf(client).tableSession.updateMany({
      where: { id, tenantId: context.tenantId, storeId: context.storeId },
      data: { status: TableSessionStatus.settled },
    });
    if (result.count !== 1) return null;
    return clientOf(client).tableSession.findFirst({
      where: { id, tenantId: context.tenantId, storeId: context.storeId },
      select: selectSession,
    });
  }

  tableExists(
    context: TenantContext,
    tableId: string,
    client: PrismaClientLike = this.prisma,
  ): Promise<{ id: string } | null> {
    return clientOf(client).table.findFirst({
      where: {
        id: tableId,
        tenantId: context.tenantId,
        storeId: context.storeId,
      },
      select: { id: true },
    });
  }

  countOpenSessionsByTable(
    context: TenantContext,
    tableIds: string[],
  ): Promise<OpenSessionCountRecord[]> {
    if (tableIds.length === 0) return Promise.resolve([]);
    return runWithTenantContext(context, async () => {
      const counts = await this.prisma.tableSession.groupBy({
        by: ['tableId'],
        where: {
          tenantId: context.tenantId,
          storeId: context.storeId,
          tableId: { in: tableIds },
          status: TableSessionStatus.open,
        },
        _count: { _all: true },
      });
      const countByTableId = new Map(
        counts.map((c) => [c.tableId, c._count._all]),
      );
      return tableIds.map((tableId) => ({
        tableId,
        openSessionCount: countByTableId.get(tableId) ?? 0,
      }));
    });
  }
}
