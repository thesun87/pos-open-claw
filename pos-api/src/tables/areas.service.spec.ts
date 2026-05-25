import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AreasService } from './areas.service';

const context = { tenantId: 't1', storeId: 's1', role: 'admin' as const };
const area = {
  id: 'a1',
  name: 'Quầy chính',
  sortOrder: 10,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AreasService', () => {
  const setup = () => {
    const repo = {
      list: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countTables: jest.fn(),
    };
    const prisma = {
      $transaction: jest.fn(<T>(fn: (tx: object) => Promise<T>) =>
        fn({ tx: true }),
      ),
    };
    return {
      service: new AreasService(repo as never, prisma as never),
      repo,
      prisma,
    };
  };

  it('rejects missing tenant context', async () => {
    const { service } = setup();
    await expect(
      service.create(undefined, { name: 'A' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates area with default sortOrder=0 and isActive=true when omitted', async () => {
    const { service, repo } = setup();
    const created = { ...area, sortOrder: 0, isActive: true };
    repo.create.mockResolvedValue(created);
    const result = await service.create(context, { name: 'Quầy chính' });
    expect(result).toBe(created);
    expect(repo.create).toHaveBeenCalledWith(
      context,
      { name: 'Quầy chính' },
      { tx: true },
    );
  });

  it('creates area and respects sortOrder/isActive override', async () => {
    const { service, repo } = setup();
    const created = { ...area, sortOrder: 20, isActive: false };
    repo.create.mockResolvedValue(created);
    const result = await service.create(context, {
      name: 'Sân ngoài',
      sortOrder: 20,
      isActive: false,
    });
    expect(result).toBe(created);
    expect(repo.create).toHaveBeenCalledWith(
      context,
      { name: 'Sân ngoài', sortOrder: 20, isActive: false },
      { tx: true },
    );
  });

  it('updates partial area inside transaction', async () => {
    const { service, repo } = setup();
    repo.findById.mockResolvedValue(area);
    repo.update.mockResolvedValue({ ...area, name: 'Khu VIP' });
    await service.update(context, 'a1', { name: 'Khu VIP' });
    expect(repo.findById).toHaveBeenCalledWith(context, 'a1', { tx: true });
    expect(repo.update).toHaveBeenCalledWith(
      context,
      'a1',
      { name: 'Khu VIP' },
      { tx: true },
    );
  });

  it('maps missing area to 404 NotFoundException', async () => {
    const { service, repo } = setup();
    repo.findById.mockResolvedValue(null);
    await expect(
      service.update(context, 'missing', { name: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('blocks delete when tables exist with tableCount in response', async () => {
    const { service, repo } = setup();
    repo.findById.mockResolvedValue(area);
    repo.countTables.mockResolvedValue(3);
    let caught: unknown;
    try {
      await service.delete(context, 'a1');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ConflictException);
    const err = caught as ConflictException;
    expect(err.getResponse()).toMatchObject({
      type: 'https://pos.example/errors/area-has-tables',
      tableCount: 3,
    });
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('maps duplicate name P2002 to 409 area-name-conflict', async () => {
    const { service, repo } = setup();
    const error = new Prisma.PrismaClientKnownRequestError('Unique failed', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['tenant_id', 'store_id', 'name'] },
    });
    repo.create.mockRejectedValue(error);
    await expect(
      service.create(context, { name: 'Quầy chính' }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.create(context, { name: 'Quầy chính' }),
    ).rejects.toHaveProperty(
      'response.type',
      'https://pos.example/errors/area-name-conflict',
    );
  });

  it('rejects empty PATCH body with validation conflict', async () => {
    const { service } = setup();
    await expect(service.update(context, 'a1', {})).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('cross-tenant scoped miss returns 404 without count/delete', async () => {
    const { service, repo } = setup();
    repo.findById.mockResolvedValue(null);
    await expect(
      service.delete(context, 'area-from-another-tenant'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.countTables).not.toHaveBeenCalled();
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('delete success when no tables — repo.delete called once', async () => {
    const { service, repo } = setup();
    repo.findById.mockResolvedValue(area);
    repo.countTables.mockResolvedValue(0);
    repo.delete.mockResolvedValue(area);
    await service.delete(context, 'a1');
    expect(repo.delete).toHaveBeenCalledWith(context, 'a1', { tx: true });
    expect(repo.delete).toHaveBeenCalledTimes(1);
  });
});
