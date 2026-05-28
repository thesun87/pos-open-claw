import { AreasRepository } from './areas.repository';

type AreaFindManyMock = jest.Mock<
  Promise<{ id: string }[]>,
  [Record<string, unknown>?]
>;

type PrismaMock = {
  area: { findMany: AreaFindManyMock };
};

const context = {
  tenantId: 'tenant-1',
  storeId: 'store-1',
  role: 'admin' as const,
};

function setup() {
  const prisma: PrismaMock = {
    area: {
      findMany: jest.fn<
        Promise<{ id: string }[]>,
        [Record<string, unknown>?]
      >(),
    },
  };
  return { prisma, repository: new AreasRepository(prisma as never) };
}

describe('AreasRepository.list', () => {
  it('scopes findMany by tenantId and storeId from context', async () => {
    const { prisma, repository } = setup();
    prisma.area.findMany.mockResolvedValue([]);

    await repository.list(context);

    expect(prisma.area.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', storeId: 'store-1' },
      select: {
        id: true,
        name: true,
        sortOrder: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  });
});
