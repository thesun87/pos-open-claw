import { Injectable } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { TenantContext } from '../../common/decorators/tenant-context.decorator';
import { runWithTenantContext } from '../../common/middleware/tenant-scope.middleware';
import { tenantScopeExtension } from '../../prisma/tenant-scope.extension';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

export type CategoryRecord = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
export type ScopedPrismaClient = PrismaService & {
  category: PrismaService['category'];
  product: PrismaService['product'];
  menuVersion: PrismaService['menuVersion'];
};
export type TransactionClient = Parameters<
  Parameters<PrismaService['$transaction']>[0]
>[0];

type PrismaClientLike = ScopedPrismaClient | TransactionClient;

export function tenantScopedClient(
  client: PrismaClientLike,
): ScopedPrismaClient {
  if ('$extends' in client && typeof client.$extends === 'function') {
    return client.$extends(tenantScopeExtension) as ScopedPrismaClient;
  }
  return client as ScopedPrismaClient;
}
const selectCategory = {
  id: true,
  name: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}
  list(context: TenantContext): Promise<CategoryRecord[]> {
    return runWithTenantContext(context, () =>
      this.prisma.category.findMany({
        select: selectCategory,
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
      tenantScopedClient(client).category.findFirst({
        where: { id },
        select: selectCategory,
      }),
    );
  }
  create(
    context: TenantContext,
    dto: CreateCategoryDto,
    client: PrismaClientLike,
  ) {
    return runWithTenantContext(context, () =>
      tenantScopedClient(client).category.create({
        data: {
          id: uuidv7(),
          tenantId: context.tenantId,
          storeId: context.storeId,
          name: dto.name,
          sortOrder: dto.sortOrder,
        },
        select: selectCategory,
      }),
    );
  }
  update(
    context: TenantContext,
    id: string,
    dto: UpdateCategoryDto,
    client: PrismaClientLike,
  ) {
    return runWithTenantContext(context, async () => {
      const result = await tenantScopedClient(client).category.updateMany({
        where: { id },
        data: dto,
      });
      if (result.count !== 1) return null;
      return tenantScopedClient(client).category.findFirst({
        where: { id },
        select: selectCategory,
      });
    });
  }
  delete(context: TenantContext, id: string, client: PrismaClientLike) {
    return runWithTenantContext(context, async () => {
      const existing = await tenantScopedClient(client).category.findFirst({
        where: { id },
        select: selectCategory,
      });
      if (!existing) return null;
      await tenantScopedClient(client).category.deleteMany({ where: { id } });
      return existing;
    });
  }
  countProducts(
    context: TenantContext,
    categoryId: string,
    client: PrismaClientLike,
  ) {
    return runWithTenantContext(context, () =>
      tenantScopedClient(client).product.count({ where: { categoryId } }),
    );
  }
}
