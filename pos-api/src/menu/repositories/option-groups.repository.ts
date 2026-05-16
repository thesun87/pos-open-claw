import { Injectable } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { TenantContext } from '../../common/decorators/tenant-context.decorator';
import { runWithTenantContext } from '../../common/middleware/tenant-scope.middleware';
import { PrismaService } from '../../prisma/prisma.service';
import { tenantScopedClient, TransactionClient } from './categories.repository';
import {
  CreateOptionGroupDto,
  OptionInputDto,
} from '../dto/create-option-group.dto';
import { UpdateOptionGroupDto } from '../dto/update-option-group.dto';

type Client = PrismaService | TransactionClient;
const optionSelect = {
  id: true,
  name: true,
  priceDeltaVnd: true,
  isDefault: true,
  sortOrder: true,
  isActive: true,
} as const;
const groupSelect = {
  id: true,
  name: true,
  isRequired: true,
  minSelect: true,
  maxSelect: true,
  sortOrder: true,
  options: {
    select: optionSelect,
    orderBy: [{ sortOrder: 'asc' as const }, { name: 'asc' as const }],
  },
};
export type OptionGroupRecord = {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  options: {
    id: string;
    label: string;
    priceDeltaVnd: number;
    isDefault: boolean;
    sortOrder: number;
    isActive?: boolean;
  }[];
};
export class OptionChildNotFoundError extends Error {
  constructor(readonly optionId: string) {
    super(`Option ${optionId} does not belong to option group`);
  }
}

function mapGroup(g: any): OptionGroupRecord {
  return {
    ...g,
    options: g.options.map((o: any) => ({
      id: o.id,
      label: o.name,
      priceDeltaVnd: o.priceDeltaVnd,
      isDefault: o.isDefault,
      sortOrder: o.sortOrder,
      ...(o.isActive === false ? { isActive: false } : {}),
    })),
  };
}

@Injectable()
export class OptionGroupsRepository {
  constructor(private readonly prisma: PrismaService) {}
  list(context: TenantContext) {
    return runWithTenantContext(context, async () =>
      (
        await tenantScopedClient(this.prisma as any).optionGroup.findMany({
          select: groupSelect,
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        })
      ).map(mapGroup),
    );
  }
  findById(context: TenantContext, id: string, client: Client = this.prisma) {
    return runWithTenantContext(context, async () => {
      const g = await tenantScopedClient(client as any).optionGroup.findFirst({
        where: { id },
        select: groupSelect,
      });
      return g ? mapGroup(g) : null;
    });
  }
  async createWithOptions(
    context: TenantContext,
    dto: CreateOptionGroupDto,
    client: Client,
  ) {
    return runWithTenantContext(context, async () => {
      const id = uuidv7();
      await tenantScopedClient(client as any).optionGroup.create({
        data: {
          id,
          tenantId: context.tenantId,
          storeId: context.storeId,
          name: dto.name,
          isRequired: dto.isRequired,
          minSelect: dto.minSelect,
          maxSelect: dto.maxSelect,
          sortOrder: dto.sortOrder,
          options: {
            create: dto.options.map((o) => {
              const { optionGroupId, ...rest } = this.optionCreateData(
                context,
                id,
                o,
              );
              return rest;
            }),
          },
        },
      });
      return this.findById(context, id, client);
    });
  }
  async updateWithOptions(
    context: TenantContext,
    id: string,
    dto: UpdateOptionGroupDto,
    client: Client,
  ) {
    return runWithTenantContext(context, async () => {
      const scoped = tenantScopedClient(client);
      await scoped.optionGroup.updateMany({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.isRequired !== undefined
            ? { isRequired: dto.isRequired }
            : {}),
          ...(dto.minSelect !== undefined ? { minSelect: dto.minSelect } : {}),
          ...(dto.maxSelect !== undefined ? { maxSelect: dto.maxSelect } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
      });
      if (dto.options) {
        const existing = await scoped.option.findMany({
          where: { optionGroupId: id },
          select: { id: true },
        });
        const submitted = new Set(
          dto.options.filter((o) => o.id).map((o) => o.id!),
        );
        for (const o of dto.options) {
          if (o.id) {
            const result = await scoped.option.updateMany({
              where: { id: o.id, optionGroupId: id },
              data: {
                name: o.label,
                priceDeltaVnd: o.priceDeltaVnd,
                isDefault: o.isDefault ?? false,
                sortOrder: o.sortOrder,
                isActive: true,
              },
            });
            if (result.count !== 1) throw new OptionChildNotFoundError(o.id);
          } else {
            await scoped.option.create({
              data: this.optionCreateData(context, id, o),
            });
          }
        }
        for (const old of existing)
          if (!submitted.has(old.id))
            await scoped.option.deleteMany({
              where: { id: old.id, optionGroupId: id },
            });
      }
      return this.findById(context, id, client);
    });
  }
  countProductAssignments(context: TenantContext, id: string, client: Client) {
    return runWithTenantContext(context, () =>
      tenantScopedClient(client as any).product.count({
        where: { productOptionGroups: { some: { optionGroupId: id } } },
      }),
    );
  }
  countHistoricalOptionReferences(
    context: TenantContext,
    optionIds: string[],
    client: Client,
  ) {
    if (!optionIds.length) return Promise.resolve(0);
    return runWithTenantContext(context, () =>
      tenantScopedClient(client as any).option.count({
        where: {
          id: { in: optionIds },
          orderItemOptions: { some: {} },
        },
      }),
    );
  }
  async delete(context: TenantContext, id: string, client: Client) {
    return runWithTenantContext(context, async () => {
      const scoped = tenantScopedClient(client);
      const options = await scoped.option.findMany({
        where: { optionGroupId: id },
        select: { id: true },
      });
      await scoped.option.deleteMany({ where: { optionGroupId: id } });
      await scoped.optionGroup.deleteMany({ where: { id } });
      return options.map((o) => o.id);
    });
  }
  private optionCreateData(
    context: TenantContext,
    groupId: string,
    o: OptionInputDto,
  ) {
    return {
      id: o.id ?? uuidv7(),
      tenantId: context.tenantId,
      storeId: context.storeId,
      optionGroupId: groupId,
      name: o.label,
      priceDeltaVnd: o.priceDeltaVnd,
      isDefault: o.isDefault ?? false,
      sortOrder: o.sortOrder,
    };
  }
}
