import { Injectable } from '@nestjs/common';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import { runWithTenantContext } from '../common/middleware/tenant-scope.middleware';
import { PrismaService } from '../prisma/prisma.service';

export type CurrentStoreRecord = {
  id: string;
  name: string;
  code: string;
  tableMode: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const selectCurrentStore = {
  id: true,
  name: true,
  code: true,
  tableMode: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class StoresRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCurrentStore(context: TenantContext): Promise<CurrentStoreRecord | null> {
    return runWithTenantContext(context, () =>
      this.prisma.store.findFirst({
        where: { id: context.storeId, tenantId: context.tenantId },
        select: selectCurrentStore,
      }),
    );
  }

  updateCurrentStoreTableMode(
    context: TenantContext,
    tableMode: boolean,
  ): Promise<CurrentStoreRecord | null> {
    return runWithTenantContext(context, async () => {
      const result = await this.prisma.store.updateMany({
        where: { id: context.storeId, tenantId: context.tenantId },
        data: { tableMode },
      });
      if (result.count === 0) return null;
      return this.prisma.store.findFirst({
        where: { id: context.storeId, tenantId: context.tenantId },
        select: selectCurrentStore,
      });
    });
  }
}
