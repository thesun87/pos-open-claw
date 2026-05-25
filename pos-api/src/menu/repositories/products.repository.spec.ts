import { MissingTenantContextError } from '../../common/errors/missing-tenant-context.error';
import { prismaTenantScopeTestUtils } from '../../prisma/tenant-scope.extension';
import { ProductsRepository } from './products.repository';

type ProductFindManyArgs = {
  select: {
    productOptionGroups: {
      orderBy: unknown;
    };
  };
};

const context = {
  tenantId: '018f0000-0000-7000-8000-000000000001',
  storeId: '018f0000-0000-7000-8000-000000000002',
  role: 'admin' as const,
};
const categoryId = '018f0000-0000-7000-8000-000000000101';
const otherCategoryId = '018f0000-0000-7000-8000-000000000102';
const groupA = '018f0000-0000-7000-8000-000000000201';
const groupB = '018f0000-0000-7000-8000-000000000202';

function productPayload(overrides: Record<string, unknown> = {}) {
  const base = {
    id: '018f0000-0000-7000-8000-000000000301',
    name: 'Bạc xỉu',
    categoryId,
    category: { id: categoryId, name: 'Cà phê' },
    priceVnd: 35000,
    isActive: true,
    sortOrder: 20,
    productOptionGroups: [
      {
        optionGroupId: groupA,
        sortOrder: 10,
        optionGroup: {
          id: groupA,
          name: 'Size',
          isRequired: true,
          minSelect: 1,
          maxSelect: 1,
          sortOrder: 10,
        },
      },
      {
        optionGroupId: groupB,
        sortOrder: 20,
        optionGroup: {
          id: groupB,
          name: 'Topping',
          isRequired: false,
          minSelect: 0,
          maxSelect: 3,
          sortOrder: 20,
        },
      },
    ],
    createdAt: new Date('2026-05-16T00:00:00.000Z'),
    updatedAt: new Date('2026-05-16T00:00:00.000Z'),
  };
  return { ...base, ...overrides };
}

function setup() {
  const prisma = {
    product: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    category: { count: jest.fn() },
    optionGroup: { count: jest.fn() },
    productOptionGroup: {
      findMany: jest.fn(() => {
        throw new Error('direct ProductOptionGroup access is unsafe');
      }),
      deleteMany: jest.fn(() => {
        throw new Error('direct ProductOptionGroup access is unsafe');
      }),
    },
    orderItem: {
      count: jest.fn(() => {
        throw new Error('direct OrderItem access is unsafe');
      }),
    },
  };
  return { repo: new ProductsRepository(prisma as never), prisma };
}

describe('ProductsRepository', () => {
  it('lists products using category/search/isActive filters and stable sorting, then maps assignments in repository shape', async () => {
    const { repo, prisma } = setup();
    prisma.product.findMany.mockResolvedValue([productPayload()]);

    await expect(
      repo.list(context, {
        categoryId,
        search: 'bạc',
        isActive: true,
      }),
    ).resolves.toMatchObject([
      {
        id: '018f0000-0000-7000-8000-000000000301',
        name: 'Bạc xỉu',
        categoryId,
        category: { id: categoryId, name: 'Cà phê' },
        optionGroupIds: [groupA, groupB],
        optionGroups: [
          { id: groupA, name: 'Size' },
          { id: groupB, name: 'Topping' },
        ],
      },
    ]);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          categoryId,
          name: { contains: 'bạc', mode: 'insensitive' },
          isActive: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    );
    const [[findManyArgs]] = prisma.product.findMany.mock.calls as [
      [ProductFindManyArgs],
    ];
    expect(findManyArgs.select.productOptionGroups.orderBy).toEqual([
      { sortOrder: 'asc' },
      { optionGroup: { sortOrder: 'asc' } },
      { optionGroup: { name: 'asc' } },
    ]);
  });

  it('creates a product with multiple option groups and join sortOrder follows submitted array order', async () => {
    const { repo, prisma } = setup();
    prisma.product.create.mockResolvedValue(undefined);
    prisma.product.findFirst.mockResolvedValue(productPayload());

    await repo.createWithAssignments(
      context,
      {
        name: 'Bạc xỉu',
        categoryId,
        priceVnd: 35000,
        sortOrder: 20,
        optionGroupIds: [groupB, groupA],
      },
      prisma as never,
    );

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: context.tenantId,
          storeId: context.storeId,
          categoryId,
          productOptionGroups: {
            create: [
              { optionGroupId: groupB, sortOrder: 10 },
              { optionGroupId: groupA, sortOrder: 20 },
            ],
          },
        }) as Record<string, unknown>,
      }),
    );
  });

  it('updates product fields without touching assignments when optionGroupIds is omitted', async () => {
    const { repo, prisma } = setup();
    prisma.product.updateMany.mockResolvedValue({ count: 1 });
    prisma.product.findFirst.mockResolvedValue(
      productPayload({ priceVnd: 36000 }),
    );

    await repo.updateWithAssignments(
      context,
      '018f0000-0000-7000-8000-000000000301',
      { priceVnd: 36000 },
      prisma as never,
    );

    expect(prisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: '018f0000-0000-7000-8000-000000000301' },
      data: { priceVnd: 36000 },
    });
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it('updates with optionGroupIds empty array to unassign all groups', async () => {
    const { repo, prisma } = setup();
    prisma.product.updateMany.mockResolvedValue({ count: 1 });
    prisma.product.update.mockResolvedValue(undefined);
    prisma.product.findFirst.mockResolvedValue(
      productPayload({ productOptionGroups: [] }),
    );

    await repo.updateWithAssignments(
      context,
      '018f0000-0000-7000-8000-000000000301',
      { optionGroupIds: [] },
      prisma as never,
    );

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: '018f0000-0000-7000-8000-000000000301' },
      data: { productOptionGroups: { deleteMany: {}, create: [] } },
    });
  });

  it('supports cross-tenant/category/option-group non-match checks through scoped count helpers', async () => {
    const { repo, prisma } = setup();
    prisma.category.count.mockResolvedValue(0);
    prisma.optionGroup.count.mockResolvedValue(1);

    await expect(
      repo.categoryExists(context, otherCategoryId, prisma as never),
    ).resolves.toBe(0);
    await expect(
      repo.countExistingOptionGroups(
        context,
        [groupA, groupB],
        prisma as never,
      ),
    ).resolves.toBe(1);
    expect(prisma.category.count).toHaveBeenCalledWith({
      where: { id: otherCategoryId },
    });
    expect(prisma.optionGroup.count).toHaveBeenCalledWith({
      where: { id: { in: [groupA, groupB] } },
    });
  });

  it('counts historical order items via scoped Product relation count so service can return delete 409', async () => {
    const { repo, prisma } = setup();
    prisma.product.findFirst.mockResolvedValue({
      _count: { orderItems: 3 },
    });

    await expect(
      repo.countHistoricalOrderItems(
        context,
        '018f0000-0000-7000-8000-000000000301',
        prisma as never,
      ),
    ).resolves.toBe(3);
    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: '018f0000-0000-7000-8000-000000000301' },
      select: { _count: { select: { orderItems: true } } },
    });
    expect(prisma.orderItem.count).not.toHaveBeenCalled();
  });

  it('deletes assignments through nested product writes and never through blocked relation model delegates', async () => {
    const { repo, prisma } = setup();
    prisma.product.update.mockResolvedValue(undefined);
    prisma.product.deleteMany.mockResolvedValue({ count: 1 });

    await repo.delete(
      context,
      '018f0000-0000-7000-8000-000000000301',
      prisma as never,
    );

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: '018f0000-0000-7000-8000-000000000301' },
      data: { productOptionGroups: { deleteMany: {} } },
    });
    expect(prisma.product.deleteMany).toHaveBeenCalledWith({
      where: { id: '018f0000-0000-7000-8000-000000000301' },
    });
    expect(prisma.productOptionGroup.deleteMany).not.toHaveBeenCalled();
  });

  it('documents relation-model access safety: ProductOptionGroup and OrderItem are blocked under tenant scope', () => {
    expect(
      prismaTenantScopeTestUtils.BLOCKED_RELATION_MODELS.has(
        'ProductOptionGroup',
      ),
    ).toBe(true);
    expect(
      prismaTenantScopeTestUtils.BLOCKED_RELATION_MODELS.has('OrderItem'),
    ).toBe(true);
    expect(MissingTenantContextError).toBeDefined();
  });
});
