import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';
import { TenantContext } from '../../common/decorators/tenant-context.decorator';
import { runWithTenantContext } from '../../common/middleware/tenant-scope.middleware';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { ListProductsQueryDto } from '../dto/list-products-query.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { tenantScopedClient, TransactionClient } from './categories.repository';

type Client = PrismaService | TransactionClient;

const optionGroupAssignmentSelect = {
  optionGroupId: true,
  sortOrder: true,
  optionGroup: {
    select: {
      id: true,
      name: true,
      isRequired: true,
      minSelect: true,
      maxSelect: true,
      sortOrder: true,
    },
  },
} satisfies Prisma.ProductOptionGroupSelect;

const productSelect = {
  id: true,
  name: true,
  categoryId: true,
  category: { select: { id: true, name: true } },
  priceVnd: true,
  isActive: true,
  sortOrder: true,
  productOptionGroups: {
    select: optionGroupAssignmentSelect,
    orderBy: [
      { sortOrder: 'asc' as const },
      { optionGroup: { sortOrder: 'asc' as const } },
      { optionGroup: { name: 'asc' as const } },
    ],
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect;

type ProductPayload = Prisma.ProductGetPayload<{
  select: typeof productSelect;
}>;

export type ProductRecord = {
  id: string;
  name: string;
  categoryId: string;
  category: { id: string; name: string };
  priceVnd: number;
  isActive: boolean;
  sortOrder: number;
  optionGroupIds: string[];
  optionGroups: {
    id: string;
    name: string;
    isRequired: boolean;
    minSelect: number;
    maxSelect: number;
    sortOrder: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
};

function mapProduct(product: ProductPayload): ProductRecord {
  const assignments = product.productOptionGroups;
  return {
    id: product.id,
    name: product.name,
    categoryId: product.categoryId,
    category: product.category,
    priceVnd: product.priceVnd,
    isActive: product.isActive,
    sortOrder: product.sortOrder,
    optionGroupIds: assignments.map((a) => a.optionGroupId),
    optionGroups: assignments.map((a) => a.optionGroup),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function assignmentCreates(optionGroupIds: string[] | undefined) {
  return (optionGroupIds ?? []).map((optionGroupId, index) => ({
    optionGroupId,
    sortOrder: (index + 1) * 10,
  }));
}

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(context: TenantContext, query: ListProductsQueryDto) {
    return runWithTenantContext(context, async () => {
      const products = await tenantScopedClient(this.prisma).product.findMany({
        where: {
          ...(query.categoryId ? { categoryId: query.categoryId } : {}),
          ...(query.search
            ? { name: { contains: query.search, mode: 'insensitive' as const } }
            : {}),
          ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
        },
        select: productSelect,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
      return products.map(mapProduct);
    });
  }

  findById(context: TenantContext, id: string, client: Client = this.prisma) {
    return runWithTenantContext(context, async () => {
      const product = await tenantScopedClient(client).product.findFirst({
        where: { id },
        select: productSelect,
      });
      return product ? mapProduct(product) : null;
    });
  }

  categoryExists(context: TenantContext, categoryId: string, client: Client) {
    return runWithTenantContext(context, () =>
      tenantScopedClient(client).category.count({ where: { id: categoryId } }),
    );
  }

  async countExistingOptionGroups(
    context: TenantContext,
    optionGroupIds: string[],
    client: Client,
  ) {
    if (!optionGroupIds.length) return 0;
    return runWithTenantContext(context, () =>
      tenantScopedClient(client).optionGroup.count({
        where: { id: { in: optionGroupIds } },
      }),
    );
  }

  createWithAssignments(
    context: TenantContext,
    dto: CreateProductDto,
    client: Client,
  ) {
    return runWithTenantContext(context, async () => {
      const id = uuidv7();
      await tenantScopedClient(client).product.create({
        data: {
          id,
          tenantId: context.tenantId,
          storeId: context.storeId,
          name: dto.name,
          categoryId: dto.categoryId,
          priceVnd: dto.priceVnd,
          isActive: dto.isActive ?? true,
          sortOrder: dto.sortOrder,
          productOptionGroups: {
            create: assignmentCreates(dto.optionGroupIds),
          },
        },
      });
      return this.findById(context, id, client);
    });
  }

  async updateWithAssignments(
    context: TenantContext,
    id: string,
    dto: UpdateProductDto,
    client: Client,
  ) {
    return runWithTenantContext(context, async () => {
      const scoped = tenantScopedClient(client);
      await scoped.product.updateMany({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.categoryId !== undefined
            ? { categoryId: dto.categoryId }
            : {}),
          ...(dto.priceVnd !== undefined ? { priceVnd: dto.priceVnd } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
      });
      if (dto.optionGroupIds !== undefined) {
        await scoped.product.update({
          where: { id },
          data: {
            productOptionGroups: {
              deleteMany: {},
              create: assignmentCreates(dto.optionGroupIds),
            },
          },
        });
      }
      return this.findById(context, id, client);
    });
  }

  toggleActive(
    context: TenantContext,
    id: string,
    isActive: boolean,
    client: Client,
  ) {
    return runWithTenantContext(context, async () => {
      await tenantScopedClient(client).product.updateMany({
        where: { id },
        data: { isActive },
      });
      return this.findById(context, id, client);
    });
  }

  countHistoricalOrderItems(
    context: TenantContext,
    id: string,
    client: Client,
  ) {
    return runWithTenantContext(context, async () => {
      const product = await tenantScopedClient(client).product.findFirst({
        where: { id },
        select: { _count: { select: { orderItems: true } } },
      });
      return product?._count.orderItems ?? 0;
    });
  }

  async delete(context: TenantContext, id: string, client: Client) {
    return runWithTenantContext(context, async () => {
      await tenantScopedClient(client).product.update({
        where: { id },
        data: { productOptionGroups: { deleteMany: {} } },
      });
      await tenantScopedClient(client).product.deleteMany({
        where: { id },
      });
    });
  }
}
