import { ForbiddenException, Injectable } from '@nestjs/common';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import { PROBLEM_TYPES } from '../common/errors/problem-types';
import { TablesRepository } from './tables.repository';

export type TableOccupancyStatus = 'empty' | 'occupied' | 'pending_sync';
export type TableStatusResponse = {
  tableId: string;
  status: TableOccupancyStatus;
  activeOrderCount: number;
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
  constructor(private readonly repo: TablesRepository) {}

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
    return rows.map((row) => ({
      tableId: row.tableId,
      activeOrderCount: row.activeOrderCount,
      status: row.activeOrderCount > 0 ? 'occupied' : 'empty',
    }));
  }
}
