import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import { PROBLEM_TYPES } from '../common/errors/problem-types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { AreaRecord, AreasRepository } from './areas.repository';

export type AreaResponse = AreaRecord;

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

@Injectable()
export class AreasService {
  constructor(
    private readonly repo: AreasRepository,
    private readonly prisma: PrismaService,
  ) {}

  list(context: TenantContext | undefined): Promise<AreaResponse[]> {
    this.ensureContext(context);
    return this.repo.list(context);
  }

  async create(
    context: TenantContext | undefined,
    dto: CreateAreaDto,
  ): Promise<AreaResponse> {
    this.ensureContext(context);
    try {
      return await this.prisma.$transaction(async (tx) => {
        return this.repo.create(context, dto, tx);
      });
    } catch (error) {
      this.mapMutationError(error);
    }
  }

  async update(
    context: TenantContext | undefined,
    id: string,
    dto: UpdateAreaDto,
  ): Promise<AreaResponse> {
    this.ensureContext(context);
    if (Object.keys(dto).length === 0)
      throw new ConflictException({
        type: PROBLEM_TYPES.validation,
        title: 'Bad Request',
        detail: 'Payload must include at least one field',
      });
    try {
      return await this.prisma.$transaction(async (tx) => {
        const exists = await this.repo.findById(context, id, tx);
        if (!exists) this.throwNotFound();
        const area = await this.repo.update(context, id, dto, tx);
        if (!area) this.throwNotFound();
        return area;
      });
    } catch (error) {
      this.mapMutationError(error);
    }
  }

  async delete(context: TenantContext | undefined, id: string): Promise<void> {
    this.ensureContext(context);
    try {
      await this.prisma.$transaction(async (tx) => {
        const exists = await this.repo.findById(context, id, tx);
        if (!exists) this.throwNotFound();
        const count = await this.repo.countTables(context, id, tx);
        if (count > 0)
          throw new ConflictException({
            type: PROBLEM_TYPES.areaHasTables,
            title: 'Khu vực đang chứa bàn',
            detail: `Khu vực đang chứa ${count} bàn; hãy chuyển hoặc xóa bàn trước.`,
            tableCount: count,
          });
        await this.repo.delete(context, id, tx);
      });
    } catch (error) {
      this.mapMutationError(error);
    }
  }

  private ensureContext(
    context: TenantContext | undefined,
  ): asserts context is TenantContext {
    if (!context?.tenantId || !context.storeId)
      throw new ForbiddenException('Missing tenant context');
  }

  private throwNotFound(): never {
    throw new NotFoundException({
      type: PROBLEM_TYPES.notFound,
      title: 'Not Found',
      detail: 'Area not found',
    });
  }

  private mapMutationError(error: unknown): never {
    if (isP2002(error))
      throw new ConflictException({
        type: PROBLEM_TYPES.areaNameConflict,
        title: 'Tên khu vực đã tồn tại',
        detail: 'Tên khu vực phải duy nhất trong store.',
      });
    if (isP2025(error)) this.throwNotFound();
    throw error;
  }
}
