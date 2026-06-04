import { ForbiddenException, Injectable } from '@nestjs/common';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import { PROBLEM_TYPES } from '../common/errors/problem-types';
import { TablesRepository } from './tables.repository';
import { TableSessionsRepository } from './table-sessions.repository';

export type TableOccupancyStatus = 'empty' | 'occupied' | 'pending_sync';
export type TableStatusResponse = {
  tableId: string;
  status: TableOccupancyStatus;
  activeOrderCount: number;
  openSessionCount: number;
  conflict: boolean;
};

export function startOfTodayHoChiMinhUtc(now = new Date()): Date {
  const local = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) -
      7 * 60 * 60 * 1000,
  );
}

@Injectable()
export class TableStatusService {
  constructor(
    private readonly repo: TablesRepository,
    private readonly sessionRepo: TableSessionsRepository,
  ) {}

  async listStatus(
    context: TenantContext | undefined,
  ): Promise<TableStatusResponse[]> {
    if (!context?.tenantId || !context.storeId)
      throw new ForbiddenException({
        type: PROBLEM_TYPES.forbidden,
        title: 'Forbidden',
        detail: 'Missing tenant context',
      });

    const rows = await this.repo.listActiveTableOrderCounts(
      context,
      startOfTodayHoChiMinhUtc(),
    );

    const tableIds = rows.map((r) => r.tableId);
    const sessionCounts =
      tableIds.length > 0
        ? await this.sessionRepo.countOpenSessionsByTable(context, tableIds)
        : [];

    const sessionCountByTableId = new Map(
      sessionCounts.map((s) => [s.tableId, s.openSessionCount]),
    );

    return rows.map((row) => {
      const openSessionCount = sessionCountByTableId.get(row.tableId) ?? 0;
      return {
        tableId: row.tableId,
        activeOrderCount: row.activeOrderCount,
        openSessionCount,
        conflict: openSessionCount >= 2,
        status:
          openSessionCount > 0 || row.activeOrderCount > 0
            ? 'occupied'
            : 'empty',
      };
    });
  }
}
