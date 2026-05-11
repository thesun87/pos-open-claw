import { Injectable } from '@nestjs/common';
import { TenantContext } from '../../common/decorators/tenant-context.decorator';
import { runWithTenantContext } from '../../common/middleware/tenant-scope.middleware';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MenuRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCurrentMenuVersion(context: TenantContext): Promise<number> {
    return runWithTenantContext(context, async () => {
      const current = await this.prisma.menuVersion.findFirst({
        select: { version: true },
      });
      return current?.version ?? 1;
    });
  }

  findCategories(context: TenantContext) {
    return runWithTenantContext(context, () =>
      this.prisma.category.findMany({
        select: { id: true, name: true, sortOrder: true, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    );
  }

  findProducts(context: TenantContext) {
    return runWithTenantContext(context, () =>
      this.prisma.product.findMany({
        select: {
          id: true,
          name: true,
          categoryId: true,
          priceVnd: true,
          isActive: true,
          sortOrder: true,
          productOptionGroups: {
            select: {
              optionGroupId: true,
              sortOrder: true,
              optionGroup: { select: { sortOrder: true, name: true } },
            },
            orderBy: [
              { sortOrder: 'asc' },
              { optionGroup: { sortOrder: 'asc' } },
              { optionGroup: { name: 'asc' } },
            ],
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    );
  }

  findOptionGroups(context: TenantContext) {
    return runWithTenantContext(context, () =>
      this.prisma.optionGroup.findMany({
        select: {
          id: true,
          name: true,
          isRequired: true,
          minSelect: true,
          maxSelect: true,
          sortOrder: true,
          options: {
            select: {
              id: true,
              name: true,
              priceDeltaVnd: true,
              isDefault: true,
              sortOrder: true,
            },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    );
  }
}
