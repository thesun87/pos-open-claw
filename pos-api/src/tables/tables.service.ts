import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import { PROBLEM_TYPES } from '../common/errors/problem-types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { ListTablesQueryDto } from './dto/list-tables-query.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { TableRecord, TablesRepository } from './tables.repository';

export type TableResponse = TableRecord;

function isP2002(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
function isP2025(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}
function startOfTodayHoChiMinhUtc(now = new Date()): Date {
  const utcMs = now.getTime();
  const local = new Date(utcMs + 7 * 60 * 60 * 1000);
  const startLocalUtcMs = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
  );
  return new Date(startLocalUtcMs - 7 * 60 * 60 * 1000);
}

@Injectable()
export class TablesService {
  constructor(
    private readonly repo: TablesRepository,
    private readonly prisma: PrismaService,
  ) {}

  async list(
    context: TenantContext | undefined,
    query: ListTablesQueryDto = {},
  ): Promise<TableResponse[]> {
    this.ensureContext(context);
    if (query.areaId)
      await this.ensureAreaBelongsToStore(context, query.areaId);
    return this.repo.list(context, query.areaId);
  }

  async create(
    context: TenantContext | undefined,
    dto: CreateTableDto,
  ): Promise<TableResponse> {
    this.ensureContext(context);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.ensureAreaBelongsToStore(context, dto.areaId, tx);
        return this.repo.create(context, dto, tx);
      });
    } catch (error) {
      this.mapMutationError(error);
    }
  }

  async update(
    context: TenantContext | undefined,
    id: string,
    dto: UpdateTableDto,
  ): Promise<TableResponse> {
    this.ensureContext(context);
    if (Object.keys(dto).length === 0)
      this.throwValidation('Payload must include at least one field');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const exists = await this.repo.findById(context, id, tx);
        if (!exists) this.throwNotFound();
        if (dto.areaId)
          await this.ensureAreaBelongsToStore(context, dto.areaId, tx);
        const table = await this.repo.update(context, id, dto, tx);
        if (!table) this.throwNotFound();
        return table;
      });
    } catch (error) {
      this.mapMutationError(error);
    }
  }

  async delete(context: TenantContext | undefined, id: string): Promise<void> {
    this.ensureContext(context);
    await this.prisma.$transaction(async (tx) => {
      const exists = await this.repo.findById(context, id, tx);
      if (!exists) this.throwNotFound();
      const activeOrderCount = await this.repo.countActiveOrdersForToday(
        context,
        id,
        startOfTodayHoChiMinhUtc(),
        tx,
      );
      if (activeOrderCount > 0)
        throw new ConflictException({
          type: PROBLEM_TYPES.tableHasPendingOrder,
          title: 'Bàn đang có đơn chưa tất toán',
          detail: `Bàn đang có ${activeOrderCount} đơn trong ngày; hãy xử lý/hủy đơn trước khi xóa.`,
          activeOrderCount,
        });
      await this.repo.delete(context, id, tx);
    });
  }

  private ensureContext(
    context: TenantContext | undefined,
  ): asserts context is TenantContext {
    if (!context?.tenantId || !context.storeId)
      throw new ForbiddenException('Missing tenant context');
  }

  private async ensureAreaBelongsToStore(
    context: TenantContext,
    areaId: string,
    tx?: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
  ) {
    const exists = await this.repo.areaExists(
      context,
      areaId,
      tx ?? this.prisma,
    );
    if (!exists) this.throwValidation('Area không thuộc store');
  }

  private throwValidation(detail: string): never {
    throw new BadRequestException({
      type: PROBLEM_TYPES.validation,
      title: 'Bad Request',
      detail,
    });
  }

  private throwNotFound(): never {
    throw new NotFoundException({
      type: PROBLEM_TYPES.notFound,
      title: 'Not Found',
      detail: 'Table not found',
    });
  }

  private mapMutationError(error: unknown): never {
    if (isP2002(error))
      throw new ConflictException({
        type: PROBLEM_TYPES.tableNameConflict,
        title: 'Tên bàn đã tồn tại',
        detail: 'Tên bàn phải duy nhất trong store.',
      });
    if (isP2025(error)) this.throwNotFound();
    throw error;
  }
}
