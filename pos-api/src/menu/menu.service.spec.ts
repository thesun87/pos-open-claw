import { MenuService } from './menu.service';
import { MenuRepository } from './repositories/menu.repository';

const cashierContext = {
  tenantId: 'tenant-1',
  storeId: 'store-1',
  role: 'cashier' as const,
};

const adminContext = {
  tenantId: 'tenant-1',
  storeId: 'store-1',
  role: 'admin' as const,
};

function createRepository(
  overrides: Partial<jest.Mocked<MenuRepository>> = {},
) {
  return {
    findCurrentMenuVersion: jest.fn().mockResolvedValue(7),
    findCategories: jest
      .fn()
      .mockResolvedValue([
        { id: 'cat-1', name: 'Cà phê', sortOrder: 1, isActive: true },
      ]),
    findProducts: jest.fn().mockResolvedValue([
      {
        id: 'prod-1',
        name: 'Bạc Xỉu',
        categoryId: 'cat-1',
        priceVnd: 35000,
        isActive: true,
        sortOrder: 2,
        productOptionGroups: [
          { optionGroupId: 'group-1' },
          { optionGroupId: 'group-2' },
        ],
      },
    ]),
    findOptionGroups: jest.fn().mockResolvedValue([
      {
        id: 'group-1',
        name: 'Size',
        isRequired: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 1,
        options: [
          {
            id: 'opt-1',
            name: 'Size L',
            priceDeltaVnd: 5000,
            isDefault: false,
            sortOrder: 2,
          },
        ],
      },
    ]),
    ...overrides,
  } as unknown as jest.Mocked<MenuRepository>;
}

const expectedSnapshotPayload = {
  categories: [{ id: 'cat-1', name: 'Cà phê', sortOrder: 1, isActive: true }],
  products: [
    {
      id: 'prod-1',
      name: 'Bạc Xỉu',
      categoryId: 'cat-1',
      priceVnd: 35000,
      isActive: true,
      sortOrder: 2,
      optionGroupIds: ['group-1', 'group-2'],
    },
  ],
  optionGroups: [
    {
      id: 'group-1',
      name: 'Size',
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      sortOrder: 1,
      options: [
        {
          id: 'opt-1',
          label: 'Size L',
          priceDeltaVnd: 5000,
          isDefault: false,
          sortOrder: 2,
        },
      ],
    },
  ],
};

describe('MenuService', () => {
  it('maps menu records to the API snapshot contract', async () => {
    const repository = createRepository();

    await expect(
      new MenuService(repository).getMenuSnapshot(cashierContext),
    ).resolves.toEqual({ menuVersion: 7, ...expectedSnapshotPayload });
  });

  it('returns minimal payload when since_version equals current version', async () => {
    const repository = createRepository();

    await expect(
      new MenuService(repository).getVersionedMenu(cashierContext, {
        since_version: 7,
      }),
    ).resolves.toEqual({ menuVersion: 7, hasChanges: false, snapshot: null });
    expect(repository.findCategories.mock.calls).toHaveLength(0);
    expect(repository.findProducts.mock.calls).toHaveLength(0);
    expect(repository.findOptionGroups.mock.calls).toHaveLength(0);
  });

  it.each([
    ['omitted version', {}],
    ['older version', { since_version: 6 }],
    ['newer recovery version', { since_version: 8 }],
  ])('returns full snapshot for %s', async (_label, query) => {
    const repository = createRepository();

    await expect(
      new MenuService(repository).getVersionedMenu(cashierContext, query),
    ).resolves.toEqual({
      menuVersion: 7,
      hasChanges: true,
      snapshot: expectedSnapshotPayload,
    });
  });

  it('passes active-only read options for cashier even when include_inactive is true', async () => {
    const repository = createRepository();

    await new MenuService(repository).getVersionedMenu(cashierContext, {
      include_inactive: true,
    });

    expect(repository.findCategories.mock.calls[0]).toEqual([
      cashierContext,
      { includeInactive: false },
    ]);
    expect(repository.findProducts.mock.calls[0]).toEqual([
      cashierContext,
      { includeInactive: false },
    ]);
    expect(repository.findOptionGroups.mock.calls[0]).toEqual([
      cashierContext,
      { includeInactive: false },
    ]);
  });

  it('allows admin to include inactive menu entities explicitly', async () => {
    const repository = createRepository();

    await new MenuService(repository).getVersionedMenu(adminContext, {
      include_inactive: true,
    });

    expect(repository.findCategories.mock.calls[0]).toEqual([
      adminContext,
      { includeInactive: true },
    ]);
    expect(repository.findProducts.mock.calls[0]).toEqual([
      adminContext,
      { includeInactive: true },
    ]);
    expect(repository.findOptionGroups.mock.calls[0]).toEqual([
      adminContext,
      { includeInactive: true },
    ]);
  });
});
