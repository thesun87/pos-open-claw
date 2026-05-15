import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantContext } from '../../common/decorators/tenant-context.decorator';
import { PROBLEM_TYPES } from '../../common/errors/problem-types';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOptionGroupDto } from '../dto/create-option-group.dto';
import { UpdateOptionGroupDto } from '../dto/update-option-group.dto';
import {
  OptionChildNotFoundError,
  OptionGroupsRepository,
  OptionGroupRecord,
} from '../repositories/option-groups.repository';
import { MenuVersionService } from './menu-version.service';

function isP2025(e: unknown) {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025'
  );
}
function isP2003(e: unknown) {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003'
  );
}
@Injectable()
export class OptionGroupsService {
  constructor(
    private readonly repo: OptionGroupsRepository,
    private readonly menuVersion: MenuVersionService,
    private readonly prisma: PrismaService,
  ) {}
  list(context: TenantContext | undefined): Promise<OptionGroupRecord[]> {
    this.ensureContext(context);
    return this.repo.list(context);
  }
  async create(context: TenantContext | undefined, dto: CreateOptionGroupDto) {
    this.ensureContext(context);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const g = await this.repo.createWithOptions(context, dto, tx);
        await this.menuVersion.bumpMenuVersion(
          context.tenantId,
          context.storeId,
          tx,
        );
        return g;
      });
    } catch (e) {
      this.mapError(e);
    }
  }
  async update(
    context: TenantContext | undefined,
    id: string,
    dto: UpdateOptionGroupDto,
  ) {
    this.ensureContext(context);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const exists = await this.repo.findById(context, id, tx);
        if (!exists) this.notFound();
        this.validatePatchResult(exists, dto);
        if (dto.options) {
          const existingIds = exists.options.map((o) => o.id);
          const submitted = new Set(
            dto.options.filter((o) => o.id).map((o) => o.id!),
          );
          const removed = existingIds.filter((oid) => !submitted.has(oid));
          if (removed.length) {
            const refs = await this.repo.countHistoricalOptionReferences(
              context,
              removed,
              tx,
            );
            if (refs > 0)
              throw new ConflictException({
                type: PROBLEM_TYPES.optionInUse,
                title: 'Tùy chọn đang có lịch sử bán hàng',
                detail: `Có ${refs} tham chiếu lịch sử; không thể xóa tùy chọn đã dùng trong đơn hàng.`,
              });
          }
        }
        const updated = await this.repo.updateWithOptions(context, id, dto, tx);
        await this.menuVersion.bumpMenuVersion(
          context.tenantId,
          context.storeId,
          tx,
        );
        return updated;
      });
    } catch (e) {
      this.mapError(e);
    }
  }
  async delete(context: TenantContext | undefined, id: string) {
    this.ensureContext(context);
    try {
      await this.prisma.$transaction(async (tx) => {
        const exists = await this.repo.findById(context, id, tx);
        if (!exists) this.notFound();
        const assignments = await this.repo.countProductAssignments(
          context,
          id,
          tx,
        );
        if (assignments > 0)
          throw new ConflictException({
            type: PROBLEM_TYPES.optionGroupInUse,
            title: 'Nhóm tùy chọn đang được dùng',
            detail: `Nhóm tùy chọn đang được gán cho ${assignments} sản phẩm; hãy gỡ liên kết trước khi xóa.`,
          });
        const refs = await this.repo.countHistoricalOptionReferences(
          context,
          exists.options.map((o) => o.id),
          tx,
        );
        if (refs > 0)
          throw new ConflictException({
            type: PROBLEM_TYPES.optionInUse,
            title: 'Tùy chọn đang có lịch sử bán hàng',
            detail: `Có ${refs} tham chiếu lịch sử; không thể xóa nhóm tùy chọn đã dùng trong đơn hàng.`,
          });
        await this.repo.delete(context, id, tx);
        await this.menuVersion.bumpMenuVersion(
          context.tenantId,
          context.storeId,
          tx,
        );
      });
    } catch (e) {
      this.mapError(e);
    }
  }
  private ensureContext(
    context: TenantContext | undefined,
  ): asserts context is TenantContext {
    if (!context?.tenantId || !context.storeId)
      throw new ForbiddenException('Missing tenant context');
  }
  private notFound(): never {
    throw new NotFoundException({
      type: PROBLEM_TYPES.notFound,
      title: 'Not Found',
      detail: 'Option group not found',
    });
  }
  private validatePatchResult(
    existing: OptionGroupRecord,
    dto: UpdateOptionGroupDto,
  ) {
    const result = {
      isRequired: dto.isRequired ?? existing.isRequired,
      minSelect: dto.minSelect ?? existing.minSelect,
      maxSelect: dto.maxSelect ?? existing.maxSelect,
      options: dto.options ?? existing.options,
    };
    let detail: string | undefined;
    if (result.minSelect > result.maxSelect)
      detail = 'minSelect must be less than or equal to maxSelect';
    else if (result.isRequired && result.minSelect < 1)
      detail = 'minSelect must be at least 1 when isRequired is true';
    else if (
      result.maxSelect === 1 &&
      result.options.filter((o) => o.isDefault === true).length > 1
    )
      detail = 'single-select option group can have at most one default option';
    if (detail)
      throw new BadRequestException({
        type: PROBLEM_TYPES.validation,
        title: 'Invalid option group state',
        detail,
      });
  }
  private mapError(e: unknown): never {
    if (e instanceof OptionChildNotFoundError)
      throw new BadRequestException({
        type: PROBLEM_TYPES.validation,
        title: 'Invalid option id',
        detail: `Option id ${e.optionId} does not belong to this option group.`,
      });
    if (isP2025(e)) this.notFound();
    if (isP2003(e))
      throw new ConflictException({
        type: PROBLEM_TYPES.conflict,
        title: 'Conflict',
        detail: 'Option group mutation violates relational constraints.',
      });
    throw e;
  }
}
