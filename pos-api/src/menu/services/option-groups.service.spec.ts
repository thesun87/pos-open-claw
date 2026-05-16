import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OptionChildNotFoundError } from '../repositories/option-groups.repository';
import { OptionGroupsService } from './option-groups.service';
const context = { tenantId: 't1', storeId: 's1', role: 'admin' as const };
const group = {
  id: 'g1',
  name: 'Size',
  isRequired: true,
  minSelect: 1,
  maxSelect: 1,
  sortOrder: 0,
  options: [
    { id: 'o1', label: 'M', priceDeltaVnd: 0, isDefault: true, sortOrder: 0 },
  ],
};
const dto = {
  name: 'Size',
  isRequired: true,
  minSelect: 1,
  maxSelect: 1,
  sortOrder: 0,
  options: [{ label: 'M', priceDeltaVnd: 0, isDefault: true, sortOrder: 0 }],
};
describe('OptionGroupsService', () => {
  const setup = () => {
    const repo = {
      list: jest.fn(),
      findById: jest.fn(),
      createWithOptions: jest.fn(),
      updateWithOptions: jest.fn(),
      countProductAssignments: jest.fn(),
      countHistoricalOptionReferences: jest.fn(),
      delete: jest.fn(),
    };
    const menuVersion = { bumpMenuVersion: jest.fn() };
    const prisma = {
      $transaction: jest.fn(<T>(fn: (tx: object) => Promise<T>) =>
        fn({ tx: true }),
      ),
    };
    return {
      service: new OptionGroupsService(
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
    await expect(setup().service.create(undefined, dto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
  it('creates and bumps in same transaction', async () => {
    const { service, repo, menuVersion } = setup();
    repo.createWithOptions.mockResolvedValue(group);
    await expect(service.create(context, dto)).resolves.toBe(group);
    expect(repo.createWithOptions).toHaveBeenCalledWith(context, dto, {
      tx: true,
    });
    expect(menuVersion.bumpMenuVersion).toHaveBeenCalledWith('t1', 's1', {
      tx: true,
    });
  });
  it('updates existing group, checks removed option references, and bumps', async () => {
    const { service, repo, menuVersion } = setup();
    repo.findById.mockResolvedValue({
      ...group,
      options: [
        { ...group.options[0] },
        {
          id: 'o2',
          label: 'L',
          priceDeltaVnd: 5000,
          isDefault: false,
          sortOrder: 1,
        },
      ],
    });
    repo.countHistoricalOptionReferences.mockResolvedValue(0);
    repo.updateWithOptions.mockResolvedValue(group);
    await service.update(context, 'g1', {
      options: [
        {
          id: 'o1',
          label: 'M',
          priceDeltaVnd: 0,
          isDefault: true,
          sortOrder: 0,
        },
      ],
    });
    expect(repo.countHistoricalOptionReferences).toHaveBeenCalledWith(
      context,
      ['o2'],
      { tx: true },
    );
    expect(menuVersion.bumpMenuVersion).toHaveBeenCalled();
  });
  it('blocks deleting product-assigned group without bump', async () => {
    const { service, repo, menuVersion } = setup();
    repo.findById.mockResolvedValue(group);
    repo.countProductAssignments.mockResolvedValue(2);
    await expect(service.delete(context, 'g1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(service.delete(context, 'g1')).rejects.toHaveProperty(
      'response.type',
      'https://pos.example/errors/option-group-in-use',
    );
    expect(repo.delete).not.toHaveBeenCalled();
    expect(menuVersion.bumpMenuVersion).not.toHaveBeenCalled();
  });
  it('allows empty option replacement when no historical references and bumps', async () => {
    const { service, repo, menuVersion } = setup();
    repo.findById.mockResolvedValue({
      ...group,
      isRequired: false,
      minSelect: 0,
    });
    repo.countHistoricalOptionReferences.mockResolvedValue(0);
    repo.updateWithOptions.mockResolvedValue({
      ...group,
      isRequired: false,
      minSelect: 0,
      options: [],
    });
    await service.update(context, 'g1', { options: [] });
    expect(repo.updateWithOptions).toHaveBeenCalledWith(
      context,
      'g1',
      { options: [] },
      { tx: true },
    );
    expect(menuVersion.bumpMenuVersion).toHaveBeenCalled();
  });
  it('blocks partial min/max update that would make resulting state invalid', async () => {
    const { service, repo, menuVersion } = setup();
    repo.findById.mockResolvedValue({ ...group, minSelect: 1, maxSelect: 2 });
    await expect(
      service.update(context, 'g1', { minSelect: 3 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.updateWithOptions).not.toHaveBeenCalled();
    expect(menuVersion.bumpMenuVersion).not.toHaveBeenCalled();
  });
  it('blocks partial required-min result without bumping', async () => {
    const { service, repo, menuVersion } = setup();
    repo.findById.mockResolvedValue({
      ...group,
      isRequired: false,
      minSelect: 0,
    });
    await expect(
      service.update(context, 'g1', { isRequired: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.updateWithOptions).not.toHaveBeenCalled();
    expect(menuVersion.bumpMenuVersion).not.toHaveBeenCalled();
  });
  it('rejects wrong child option id without bumping', async () => {
    const { service, repo, menuVersion } = setup();
    repo.findById.mockResolvedValue(group);
    repo.countHistoricalOptionReferences.mockResolvedValue(0);
    repo.updateWithOptions.mockRejectedValue(
      new OptionChildNotFoundError('wrong'),
    );
    await expect(
      service.update(context, 'g1', {
        options: [{ id: 'wrong', label: 'X', priceDeltaVnd: 0, sortOrder: 0 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(menuVersion.bumpMenuVersion).not.toHaveBeenCalled();
  });
  it('blocks removed historical option without touching snapshots or bumping', async () => {
    const { service, repo, menuVersion } = setup();
    repo.findById.mockResolvedValue(group);
    repo.countHistoricalOptionReferences.mockResolvedValue(1);
    await expect(
      service.update(context, 'g1', { options: [] as never }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repo.updateWithOptions).not.toHaveBeenCalled();
    expect(menuVersion.bumpMenuVersion).not.toHaveBeenCalled();
  });
  it('maps scoped miss to 404 without bump', async () => {
    const { service, repo, menuVersion } = setup();
    repo.findById.mockResolvedValue(null);
    await expect(
      service.update(context, 'other-tenant', { name: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(menuVersion.bumpMenuVersion).not.toHaveBeenCalled();
  });
  it('deletes unused group and bumps', async () => {
    const { service, repo, menuVersion } = setup();
    repo.findById.mockResolvedValue(group);
    repo.countProductAssignments.mockResolvedValue(0);
    repo.countHistoricalOptionReferences.mockResolvedValue(0);
    await service.delete(context, 'g1');
    expect(repo.delete).toHaveBeenCalledWith(context, 'g1', { tx: true });
    expect(menuVersion.bumpMenuVersion).toHaveBeenCalledWith('t1', 's1', {
      tx: true,
    });
  });
});
