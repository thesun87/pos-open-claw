import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProductsService } from './products.service';

const context = { tenantId: 't1', storeId: 's1', role: 'admin' as const };
const groupId = '018f0000-0000-7000-8000-000000000101';
const dto = {
  name: 'Bạc xỉu',
  categoryId: '018f0000-0000-7000-8000-000000000001',
  priceVnd: 35000,
  isActive: true,
  sortOrder: 10,
  optionGroupIds: [groupId],
};
const product = {
  id: 'p1',
  ...dto,
  category: { id: dto.categoryId, name: 'Cà phê' },
  optionGroupIds: [groupId],
  optionGroups: [],
};

describe('ProductsService', () => {
  const setup = () => {
    const repo = {
      list: jest.fn(),
      findById: jest.fn(),
      categoryExists: jest.fn(),
      countExistingOptionGroups: jest.fn(),
      createWithAssignments: jest.fn(),
      updateWithAssignments: jest.fn(),
      toggleActive: jest.fn(),
      countHistoricalOrderItems: jest.fn(),
      delete: jest.fn(),
    };
    const menuVersion = { bumpMenuVersion: jest.fn() };
    const prisma = {
      $transaction: jest.fn(<T>(fn: (tx: object) => Promise<T>) =>
        fn({ tx: true }),
      ),
    };
    return {
      service: new ProductsService(repo as never, menuVersion, prisma as never),
      repo,
      menuVersion,
      prisma,
    };
  };

  it('rejects missing tenant context', async () => {
    await expect(setup().service.create(undefined, dto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lists with filters through repository', async () => {
    const { service, repo } = setup();
    repo.list.mockResolvedValue([product]);
    await expect(
      service.list(context, { search: 'bạc', isActive: true }),
    ).resolves.toEqual([product]);
    expect(repo.list).toHaveBeenCalledWith(context, {
      search: 'bạc',
      isActive: true,
    });
  });

  it('creates assignments and bumps in same transaction', async () => {
    const { service, repo, menuVersion } = setup();
    repo.categoryExists.mockResolvedValue(1);
    repo.countExistingOptionGroups.mockResolvedValue(1);
    repo.createWithAssignments.mockResolvedValue(product);
    await expect(service.create(context, dto)).resolves.toBe(product);
    expect(repo.createWithAssignments).toHaveBeenCalledWith(context, dto, {
      tx: true,
    });
    expect(menuVersion.bumpMenuVersion).toHaveBeenCalledWith('t1', 's1', {
      tx: true,
    });
  });

  it('rejects duplicate option groups before transaction bump', async () => {
    const { service, menuVersion } = setup();
    await expect(
      service.create(context, { ...dto, optionGroupIds: [groupId, groupId] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(menuVersion.bumpMenuVersion).not.toHaveBeenCalled();
  });

  it('rejects invalid category and foreign option groups without bump', async () => {
    const { service, repo, menuVersion } = setup();
    repo.categoryExists.mockResolvedValue(0);
    await expect(service.create(context, dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    repo.categoryExists.mockResolvedValue(1);
    repo.countExistingOptionGroups.mockResolvedValue(0);
    await expect(service.create(context, dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(menuVersion.bumpMenuVersion).not.toHaveBeenCalled();
  });

  it('updates product, preserves assignments when omitted, and bumps', async () => {
    const { service, repo, menuVersion } = setup();
    repo.findById.mockResolvedValue(product);
    repo.updateWithAssignments.mockResolvedValue({
      ...product,
      priceVnd: 36000,
    });
    await service.update(context, 'p1', { priceVnd: 36000 });
    expect(repo.countExistingOptionGroups).not.toHaveBeenCalled();
    expect(repo.updateWithAssignments).toHaveBeenCalledWith(
      context,
      'p1',
      { priceVnd: 36000 },
      { tx: true },
    );
    expect(menuVersion.bumpMenuVersion).toHaveBeenCalled();
  });

  it('updates product and replaces assignment set when provided', async () => {
    const { service, repo } = setup();
    repo.findById.mockResolvedValue(product);
    repo.countExistingOptionGroups.mockResolvedValue(1);
    repo.updateWithAssignments.mockResolvedValue({
      ...product,
      optionGroupIds: [groupId],
    });
    await service.update(context, 'p1', { optionGroupIds: [groupId] });
    expect(repo.countExistingOptionGroups).toHaveBeenCalledWith(
      context,
      [groupId],
      { tx: true },
    );
  });

  it('maps not found without bump', async () => {
    const { service, repo, menuVersion } = setup();
    repo.findById.mockResolvedValue(null);
    await expect(
      service.update(context, 'missing', { name: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(menuVersion.bumpMenuVersion).not.toHaveBeenCalled();
  });

  it('toggles active with deterministic payload and bumps', async () => {
    const { service, repo, menuVersion } = setup();
    repo.findById.mockResolvedValue(product);
    repo.toggleActive.mockResolvedValue({ ...product, isActive: false });
    await expect(
      service.toggleActive(context, 'p1', { isActive: false }),
    ).resolves.toMatchObject({
      isActive: false,
    });
    expect(repo.toggleActive).toHaveBeenCalledWith(context, 'p1', false, {
      tx: true,
    });
    expect(menuVersion.bumpMenuVersion).toHaveBeenCalled();
  });

  it('blocks delete when historical order items exist without bump', async () => {
    const { service, repo, menuVersion } = setup();
    repo.findById.mockResolvedValue(product);
    repo.countHistoricalOrderItems.mockResolvedValue(2);
    await expect(service.delete(context, 'p1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(service.delete(context, 'p1')).rejects.toHaveProperty(
      'response.type',
      'https://pos.example/errors/product-in-use',
    );
    expect(repo.delete).not.toHaveBeenCalled();
    expect(menuVersion.bumpMenuVersion).not.toHaveBeenCalled();
  });

  it('deletes unused product and bumps', async () => {
    const { service, repo, menuVersion } = setup();
    repo.findById.mockResolvedValue(product);
    repo.countHistoricalOrderItems.mockResolvedValue(0);
    await service.delete(context, 'p1');
    expect(repo.delete).toHaveBeenCalledWith(context, 'p1', { tx: true });
    expect(menuVersion.bumpMenuVersion).toHaveBeenCalledWith('t1', 's1', {
      tx: true,
    });
  });
});
