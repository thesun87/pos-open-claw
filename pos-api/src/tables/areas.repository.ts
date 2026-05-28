import { Injectable } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import { runWithTenantContext } from '../common/middleware/tenant-scope.middleware';
import { tenantScopeExtension } from '../prisma/tenant-scope.extension';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

export type AreaRecord = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type ScopedPrismaClient = PrismaService & {
  area: PrismaService['area'];
  table: PrismaService['table'];
};
export type TransactionClient = Parameters<
  Parameters<PrismaService['$transaction']>[0]
>[0];

type PrismaClientLike = ScopedPrismaClient | TransactionClient;

function tenantScopedClient(client: PrismaClientLike): ScopedPrismaClient {
  if ('$extends' in client && typeof client.$extends === 'function') {
    return client.$extends(tenantScopeExtension) as ScopedPrismaClient;
  }
  return client as ScopedPrismaClient;
}

const selectArea = {
  id: true,
  name: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AreasRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(context: TenantContext): Promise<AreaRecord[]> {
    return runWithTenantContext(context, () =>
      this.prisma.area.findMany({
        where: { tenantId: context.tenantId, storeId: context.storeId },
        select: selectArea,
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
      tenantScopedClient(client).area.findFirst({
        where: { id },
        select: selectArea,
      }),
    );
  }

  create(context: TenantContext, dto: CreateAreaDto, client: PrismaClientLike) {
    return runWithTenantContext(context, () =>
      tenantScopedClient(client).area.create({
        data: {
          id: uuidv7(),
          tenantId: context.tenantId,
          storeId: context.storeId,
          name: dto.name,
          sortOrder: dto.sortOrder ?? 0,
          ...(dto.isActive === undefined ? {} : { isActive: dto.isActive }),
        },
        select: selectArea,
      }),
    );
  }

  update(
    context: TenantContext,
    id: string,
    dto: UpdateAreaDto,
    client: PrismaClientLike,
  ) {
    return runWithTenantContext(context, async () => {
      const result = await tenantScopedClient(client).area.updateMany({
        where: { id },
        data: dto,
      });
      if (result.count !== 1) return null;
      return tenantScopedClient(client).area.findFirst({
        where: { id },
        select: selectArea,
      });
    });
  }

  delete(context: TenantContext, id: string, client: PrismaClientLike) {
    return runWithTenantContext(context, async () => {
      const existing = await tenantScopedClient(client).area.findFirst({
        where: { id },
        select: selectArea,
      });
      if (!existing) return null;
      await tenantScopedClient(client).area.deleteMany({ where: { id } });
      return existing;
    });
  }

  countTables(
    context: TenantContext,
    areaId: string,
    client: PrismaClientLike,
  ) {
    return runWithTenantContext(context, () =>
      tenantScopedClient(client).table.count({ where: { areaId } }),
    );
  }
}
