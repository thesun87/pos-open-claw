import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CategoriesService } from './categories.service';

const context = { tenantId: 't1', storeId: 's1', role: 'admin' as const };
const category = {
  id: 'c1',
  name: 'Coffee',
  sortOrder: 1,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CategoriesService', () => {
  const setup = () => {
    const repo = {
      list: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countProducts: jest.fn(),
    };
    const menuVersion = { bumpMenuVersion: jest.fn() };
    const prisma = {
      $transaction: jest.fn(<T>(fn: (tx: object) => Promise<T>) =>
        fn({ tx: true }),
      ),
    };
    return {
      service: new CategoriesService(
        repo as never,
        menuVersion,
        prisma as never,
      ),
      repo,
      menuVersion,
      prisma,
    };
  };

  it('rejects missing tenant context', async () => {
    const { service } = setup();
    await expect(
      service.create(undefined, { name: 'A', sortOrder: 0 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates category and bumps in same transaction client', async () => {
    const { service, repo, menuVersion } = setup();
    repo.create.mockResolvedValue(category);
    menuVersion.bumpMenuVersion.mockResolvedValue(1);
    await expect(
      service.create(context, { name: 'Coffee', sortOrder: 1, isActive: false }),
    ).resolves.toBe(category);
    expect(repo.create).toHaveBeenCalledWith(
      context,
      { name: 'Coffee', sortOrder: 1, isActive: false },
      { tx: true },
    );
    expect(menuVersion.bumpMenuVersion).toHaveBeenCalledWith('t1', 's1', {
      tx: true,
    });
  });

  it('updates only existing category and bumps in same transaction client', async () => {
    const { service, repo, menuVersion } = setup();
    repo.findById.mockResolvedValue(category);
    repo.update.mockResolvedValue({ ...category, name: 'Tea', isActive: false });
    await service.update(context, 'c1', { name: 'Tea', isActive: false });
    expect(repo.findById).toHaveBeenCalledWith(context, 'c1', { tx: true });
    expect(repo.update).toHaveBeenCalledWith(
      context,
      'c1',
      { name: 'Tea', isActive: false },
      { tx: true },
    );
    expect(menuVersion.bumpMenuVersion).toHaveBeenCalledWith('t1', 's1', {
      tx: true,
    });
  });

  it('maps missing category to 404 without bump', async () => {
    const { service, repo, menuVersion } = setup();
    repo.findById.mockResolvedValue(null);
    await expect(
      service.update(context, 'missing', { name: 'Tea' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
    expect(menuVersion.bumpMenuVersion).not.toHaveBeenCalled();
  });

  it('blocks delete when products exist without bumping version', async () => {
    const { service, repo, menuVersion } = setup();
    repo.findById.mockResolvedValue(category);
    repo.countProducts.mockResolvedValue(2);
    await expect(service.delete(context, 'c1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repo.delete).not.toHaveBeenCalled();
    expect(menuVersion.bumpMenuVersion).not.toHaveBeenCalled();
  });

  it('maps duplicate category name P2002 to 409 without leaking Prisma error', async () => {
    const { service, repo } = setup();
    const error = new Prisma.PrismaClientKnownRequestError('Unique failed', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['tenant_id', 'store_id', 'name'] },
    });
    repo.create.mockRejectedValue(error);
    await expect(
      service.create(context, { name: 'Coffee', sortOrder: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.create(context, { name: 'Coffee', sortOrder: 1 }),
    ).rejects.toHaveProperty(
      'response.type',
      'https://pos.example/errors/category-name-conflict',
    );
  });

  it('does not bump when mutation fails and transaction rolls back', async () => {
    const { service, repo, menuVersion, prisma } = setup();
    repo.create.mockRejectedValue(new Error('fail'));
    await expect(
      service.create(context, { name: 'Coffee', sortOrder: 1 }),
    ).rejects.toThrow('fail');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(menuVersion.bumpMenuVersion).not.toHaveBeenCalled();
  });

  it('keeps cross-tenant isolation by treating scoped miss as 404 and not bumping', async () => {
    const { service, repo, menuVersion } = setup();
    repo.findById.mockResolvedValue(null);
    await expect(
      service.delete(context, 'category-from-another-tenant'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.countProducts).not.toHaveBeenCalled();
    expect(repo.delete).not.toHaveBeenCalled();
    expect(menuVersion.bumpMenuVersion).not.toHaveBeenCalled();
  });
});
