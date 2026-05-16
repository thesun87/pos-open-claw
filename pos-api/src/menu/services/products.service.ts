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
import { CreateProductDto } from '../dto/create-product.dto';
import { ListProductsQueryDto } from '../dto/list-products-query.dto';
import { ToggleProductActiveDto } from '../dto/toggle-product-active.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import {
  ProductRecord,
  ProductsRepository,
} from '../repositories/products.repository';
import { MenuVersionService } from './menu-version.service';

function isP2003(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2003'
  );
}
function isP2025(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly repo: ProductsRepository,
    private readonly menuVersion: MenuVersionService,
    private readonly prisma: PrismaService,
  ) {}

  list(context: TenantContext | undefined, query: ListProductsQueryDto) {
    this.ensureContext(context);
    return this.repo.list(context, query);
  }

  async create(
    context: TenantContext | undefined,
    dto: CreateProductDto,
  ): Promise<ProductRecord> {
    this.ensureContext(context);
    this.rejectDuplicateOptionGroups(dto.optionGroupIds);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.validateCategory(context, dto.categoryId, tx);
        await this.validateOptionGroups(context, dto.optionGroupIds ?? [], tx);
        const product = await this.repo.createWithAssignments(context, dto, tx);
        await this.menuVersion.bumpMenuVersion(
          context.tenantId,
          context.storeId,
          tx,
        );
        return product!;
      });
    } catch (error) {
      this.mapMutationError(error);
    }
  }

  async update(
    context: TenantContext | undefined,
    id: string,
    dto: UpdateProductDto,
  ): Promise<ProductRecord> {
    this.ensureContext(context);
    if (Object.keys(dto).length === 0)
      this.badRequest('Payload must include at least one field');
    this.rejectDuplicateOptionGroups(dto.optionGroupIds);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const exists = await this.repo.findById(context, id, tx);
        if (!exists) this.notFound();
        if (dto.categoryId)
          await this.validateCategory(context, dto.categoryId, tx);
        if (dto.optionGroupIds !== undefined)
          await this.validateOptionGroups(context, dto.optionGroupIds, tx);
        const product = await this.repo.updateWithAssignments(
          context,
          id,
          dto,
          tx,
        );
        if (!product) this.notFound();
        await this.menuVersion.bumpMenuVersion(
          context.tenantId,
          context.storeId,
          tx,
        );
        return product;
      });
    } catch (error) {
      this.mapMutationError(error);
    }
  }

  async toggleActive(
    context: TenantContext | undefined,
    id: string,
    dto: ToggleProductActiveDto,
  ): Promise<ProductRecord> {
    this.ensureContext(context);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const exists = await this.repo.findById(context, id, tx);
        if (!exists) this.notFound();
        const product = await this.repo.toggleActive(
          context,
          id,
          dto.isActive,
          tx,
        );
        if (!product) this.notFound();
        await this.menuVersion.bumpMenuVersion(
          context.tenantId,
          context.storeId,
          tx,
        );
        return product;
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
        if (!exists) this.notFound();
        const count = await this.repo.countHistoricalOrderItems(
          context,
          id,
          tx,
        );
        if (count > 0)
          throw new ConflictException({
            type: PROBLEM_TYPES.productInUse,
            title: 'Sản phẩm đã có lịch sử bán hàng',
            detail: `Sản phẩm đã xuất hiện trong ${count} dòng đơn hàng; hãy “Tạm tắt” bằng isActive=false thay vì xóa nếu sẽ bán lại.`,
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

  private async validateCategory(
    context: TenantContext,
    categoryId: string,
    tx: unknown,
  ) {
    const count = await this.repo.categoryExists(
      context,
      categoryId,
      tx as never,
    );
    if (count !== 1)
      throw new BadRequestException({
        type: PROBLEM_TYPES.validation,
        title: 'Danh mục không hợp lệ',
        detail: 'categoryId không tồn tại trong tenant/store hiện tại.',
      });
  }

  private async validateOptionGroups(
    context: TenantContext,
    optionGroupIds: string[],
    tx: unknown,
  ) {
    const count = await this.repo.countExistingOptionGroups(
      context,
      optionGroupIds,
      tx as never,
    );
    if (count !== optionGroupIds.length)
      throw new BadRequestException({
        type: PROBLEM_TYPES.validation,
        title: 'Nhóm tùy chọn không hợp lệ',
        detail:
          'Một hoặc nhiều optionGroupIds không tồn tại trong tenant/store hiện tại.',
      });
  }

  private rejectDuplicateOptionGroups(optionGroupIds: string[] | undefined) {
    if (!optionGroupIds) return;
    if (new Set(optionGroupIds).size !== optionGroupIds.length)
      this.badRequest('optionGroupIds không được chứa giá trị trùng lặp.');
  }

  private badRequest(detail: string): never {
    throw new BadRequestException({
      type: PROBLEM_TYPES.validation,
      title: 'Bad Request',
      detail,
    });
  }

  private notFound(): never {
    throw new NotFoundException({
      type: PROBLEM_TYPES.notFound,
      title: 'Not Found',
      detail: 'Product not found',
    });
  }

  private mapMutationError(error: unknown): never {
    if (isP2025(error)) this.notFound();
    if (isP2003(error))
      throw new ConflictException({
        type: PROBLEM_TYPES.productInUse,
        title: 'Sản phẩm đang được tham chiếu',
        detail:
          'Không thể xóa sản phẩm do ràng buộc dữ liệu; hãy “Tạm tắt” bằng isActive=false thay vì xóa.',
      });
    throw error;
  }
}
