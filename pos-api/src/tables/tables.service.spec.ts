import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TablesService } from './tables.service';

const context = { tenantId: 't1', storeId: 's1', role: 'admin' as const };
const table = {
  id: 'tbl1',
  areaId: 'a1',
  name: 'Bàn 01',
  capacity: 2,
  sortOrder: 0,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('TablesService', () => {
  const setup = () => {
    const repo = {
      list: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      areaExists: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countActiveOrdersForToday: jest.fn(),
    };
    const prisma = {
      $transaction: jest.fn(<T>(fn: (tx: object) => Promise<T>) =>
        fn({ tx: true }),
      ),
    };
    return {
      service: new TablesService(repo as never, prisma as never),
      repo,
      prisma,
    };
  };

  it('rejects missing tenant context', async () => {
    const { service } = setup();
    await expect(
      service.create(undefined, { name: 'Bàn 01', areaId: 'a1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lists after validating area filter belongs to store', async () => {
    const { service, repo } = setup();
    repo.areaExists.mockResolvedValue({ id: 'a1' });
    repo.list.mockResolvedValue([table]);
    await expect(service.list(context, { areaId: 'a1' })).resolves.toEqual([
      table,
    ]);
    expect(repo.areaExists).toHaveBeenCalledWith(
      context,
      'a1',
      expect.any(Object),
    );
    expect(repo.list).toHaveBeenCalledWith(context, 'a1');
  });

  it('creates table with default capacity/sort/isActive via repository', async () => {
    const { service, repo } = setup();
    repo.areaExists.mockResolvedValue({ id: 'a1' });
    repo.create.mockResolvedValue(table);
    await expect(
      service.create(context, { name: 'Bàn 01', areaId: 'a1' }),
    ).resolves.toBe(table);
    expect(repo.create).toHaveBeenCalledWith(
      context,
      { name: 'Bàn 01', areaId: 'a1' },
      { tx: true },
    );
  });

  it('rejects invalid/cross-store area with validation Problem Details', async () => {
    const { service, repo } = setup();
    repo.areaExists.mockResolvedValue(null);
    await expect(
      service.create(context, { name: 'Bàn 01', areaId: 'other' }),
    ).rejects.toMatchObject({
      response: {
        type: 'https://pos.example/errors/validation',
        detail: 'Area không thuộc store',
      },
    });
  });

  it('updates and validates move target area', async () => {
    const { service, repo } = setup();
    repo.findById.mockResolvedValue(table);
    repo.areaExists.mockResolvedValue({ id: 'a2' });
    repo.update.mockResolvedValue({ ...table, areaId: 'a2' });
    await service.update(context, 'tbl1', { areaId: 'a2' });
    expect(repo.findById).toHaveBeenCalledWith(context, 'tbl1', { tx: true });
    expect(repo.areaExists).toHaveBeenCalledWith(context, 'a2', { tx: true });
    expect(repo.update).toHaveBeenCalledWith(
      context,
      'tbl1',
      { areaId: 'a2' },
      { tx: true },
    );
  });

  it('rejects empty PATCH body with 400 validation', async () => {
    const { service } = setup();
    await expect(service.update(context, 'tbl1', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('maps duplicate name P2002 to 409 table-name-conflict', async () => {
    const { service, repo } = setup();
    repo.areaExists.mockResolvedValue({ id: 'a1' });
    repo.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    await expect(
      service.create(context, { name: 'Bàn 01', areaId: 'a1' }),
    ).rejects.toMatchObject({
      response: { type: 'https://pos.example/errors/table-name-conflict' },
    });
  });

  it('blocks delete when table has active orders today', async () => {
    const { service, repo } = setup();
    repo.findById.mockResolvedValue(table);
    repo.countActiveOrdersForToday.mockResolvedValue(2);
    await expect(service.delete(context, 'tbl1')).rejects.toMatchObject({
      response: {
        type: 'https://pos.example/errors/table-has-pending-order',
        activeOrderCount: 2,
      },
    });
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('delete success when no active orders', async () => {
    const { service, repo } = setup();
    repo.findById.mockResolvedValue(table);
    repo.countActiveOrdersForToday.mockResolvedValue(0);
    repo.delete.mockResolvedValue(table);
    await service.delete(context, 'tbl1');
    expect(repo.delete).toHaveBeenCalledWith(context, 'tbl1', { tx: true });
  });

  it('cross-tenant scoped miss returns 404 without delete guard count', async () => {
    const { service, repo } = setup();
    repo.findById.mockResolvedValue(null);
    await expect(
      service.delete(context, 'other-tenant-table'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.countActiveOrdersForToday).not.toHaveBeenCalled();
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
