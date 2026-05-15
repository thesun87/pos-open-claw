import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantContext } from '../../common/decorators/tenant-context.decorator';
import { PROBLEM_TYPES } from '../../common/errors/problem-types';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import {
  CategoriesRepository,
  CategoryRecord,
} from '../repositories/categories.repository';
import { MenuVersionService } from './menu-version.service';

export type CategoryResponse = CategoryRecord;

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
export class CategoriesService {
  constructor(
    private readonly repo: CategoriesRepository,
    private readonly menuVersion: MenuVersionService,
    private readonly prisma: PrismaService,
  ) {}

  list(context: TenantContext | undefined): Promise<CategoryResponse[]> {
    this.ensureContext(context);
    return this.repo.list(context);
  }

  async create(
    context: TenantContext | undefined,
    dto: CreateCategoryDto,
  ): Promise<CategoryResponse> {
    this.ensureContext(context);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const category = await this.repo.create(context, dto, tx);
        await this.menuVersion.bumpMenuVersion(
          context.tenantId,
          context.storeId,
          tx,
        );
        return category;
      });
    } catch (error) {
      this.mapMutationError(error);
    }
  }

  async update(
    context: TenantContext | undefined,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponse> {
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
        const category = await this.repo.update(context, id, dto, tx);
        if (!category) this.throwNotFound();
        await this.menuVersion.bumpMenuVersion(
          context.tenantId,
          context.storeId,
          tx,
        );
        return category;
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
        const count = await this.repo.countProducts(context, id, tx);
        if (count > 0)
          throw new ConflictException({
            type: PROBLEM_TYPES.categoryHasProducts,
            title: 'Danh mục đang chứa sản phẩm',
            detail: `Danh mục đang chứa ${count} sản phẩm; hãy chuyển hoặc xóa sản phẩm trước.`,
          });
        await this.repo.delete(context, id, tx);
        await this.menuVersion.bumpMenuVersion(
          context.tenantId,
          context.storeId,
          tx,
        );
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
      detail: 'Category not found',
    });
  }
  private mapMutationError(error: unknown): never {
    if (isP2002(error))
      throw new ConflictException({
        type: PROBLEM_TYPES.categoryNameConflict,
        title: 'Tên danh mục đã tồn tại',
        detail: 'Category name must be unique in this tenant/store.',
      });
    if (isP2025(error)) this.throwNotFound();
    throw error;
  }
}
