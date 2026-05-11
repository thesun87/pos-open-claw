import { MenuService } from './menu.service';
import { MenuRepository } from './repositories/menu.repository';

const context = {
  tenantId: 'tenant-1',
  storeId: 'store-1',
  role: 'cashier' as const,
};

describe('MenuService', () => {
  it('maps menu records to the API snapshot contract', async () => {
    const repository = {
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
    } as unknown as jest.Mocked<MenuRepository>;

    await expect(
      new MenuService(repository).getMenuSnapshot(context),
    ).resolves.toEqual({
      menuVersion: 7,
      categories: [
        { id: 'cat-1', name: 'Cà phê', sortOrder: 1, isActive: true },
      ],
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
    });
  });
});
