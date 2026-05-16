import { MenuRepository } from './menu.repository';

type FindManyMock = jest.Mock<Promise<unknown[]>, [Record<string, unknown>?]>;

type PrismaMock = {
  menuVersion: {
    findFirst: jest.Mock<
      Promise<{ version: number } | null>,
      [Record<string, unknown>?]
    >;
  };
  category: { findMany: FindManyMock };
  product: { findMany: FindManyMock };
  optionGroup: { findMany: FindManyMock };
};

const context = {
  tenantId: 'tenant-1',
  storeId: 'store-1',
  role: 'cashier' as const,
};

function setup() {
  const prisma: PrismaMock = {
    menuVersion: {
      findFirst: jest.fn<
        Promise<{ version: number } | null>,
        [Record<string, unknown>?]
      >(),
    },
    category: {
      findMany: jest.fn<Promise<unknown[]>, [Record<string, unknown>?]>(),
    },
    product: {
      findMany: jest.fn<Promise<unknown[]>, [Record<string, unknown>?]>(),
    },
    optionGroup: {
      findMany: jest.fn<Promise<unknown[]>, [Record<string, unknown>?]>(),
    },
  };
  return {
    prisma,
    repository: new MenuRepository(prisma as never),
  };
}

describe('MenuRepository', () => {
  it('falls back to menu version 1 when no version row exists', async () => {
    const { prisma, repository } = setup();
    prisma.menuVersion.findFirst.mockResolvedValue(null);

    await expect(repository.findCurrentMenuVersion(context)).resolves.toBe(1);
  });

  it('filters categories to active rows unless inactive records are explicitly included', async () => {
    const { prisma, repository } = setup();
    prisma.category.findMany.mockResolvedValue([]);

    await repository.findCategories(context);
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );

    await repository.findCategories(context, { includeInactive: true });
    const includeInactiveQuery = prisma.category.findMany.mock.lastCall?.[0];
    expect(includeInactiveQuery).not.toHaveProperty('where');
  });

  it('filters products active-only and keeps product option group ordering', async () => {
    const { prisma, repository } = setup();
    prisma.product.findMany.mockResolvedValue([]);

    await repository.findProducts(context);

    const activeOnlyQuery = prisma.product.findMany.mock.lastCall?.[0];
    expect(activeOnlyQuery).toEqual(
      expect.objectContaining({
        where: { isActive: true },
        select: expect.objectContaining({
          productOptionGroups: expect.objectContaining({
            where: { optionGroup: { options: { some: { isActive: true } } } },
            orderBy: [
              { sortOrder: 'asc' },
              { optionGroup: { sortOrder: 'asc' } },
              { optionGroup: { name: 'asc' } },
            ],
          }) as unknown,
        }) as unknown,
      }),
    );
  });

  it('filters option groups with active options and filters inactive options', async () => {
    const { prisma, repository } = setup();
    prisma.optionGroup.findMany.mockResolvedValue([]);

    await repository.findOptionGroups(context);

    const activeOnlyQuery = prisma.optionGroup.findMany.mock.lastCall?.[0];
    expect(activeOnlyQuery).toEqual(
      expect.objectContaining({
        where: { options: { some: { isActive: true } } },
        select: expect.objectContaining({
          options: expect.objectContaining({
            where: { isActive: true },
          }) as unknown,
        }) as unknown,
      }),
    );
  });
});
