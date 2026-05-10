import { NotFoundException } from '@nestjs/common';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import { UsersRepository } from './repositories/users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const context: TenantContext = {
    tenantId: '018f0000-0000-7000-8000-000000000001',
    storeId: '018f0000-0000-7000-8000-000000000002',
    userId: '018f0000-0000-7000-8000-000000000003',
    role: 'admin',
  };
  const targetUserId = '018f0000-0000-7000-8000-000000000004';
  let repository: jest.Mocked<UsersRepository>;
  let service: UsersService;

  beforeEach(() => {
    repository = {
      updateRevokedInScope: jest.fn(),
      revokeActiveRefreshTokens: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;
    service = new UsersService(repository);
    jest.useFakeTimers().setSystemTime(new Date('2026-05-10T13:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sets scoped user revoked and revokes active refresh tokens', async () => {
    repository.updateRevokedInScope.mockResolvedValue({ count: 1 });
    repository.revokeActiveRefreshTokens.mockResolvedValue({ count: 2 });

    await service.revokeUserSession(targetUserId, context);

    expect(repository.updateRevokedInScope.mock.calls[0]).toEqual([
      targetUserId,
      context,
      true,
    ]);
    expect(repository.revokeActiveRefreshTokens.mock.calls[0]).toEqual([
      targetUserId,
      new Date('2026-05-10T13:00:00.000Z'),
    ]);
  });

  it('throws not found and does not revoke tokens when scoped user update misses', async () => {
    repository.updateRevokedInScope.mockResolvedValue({ count: 0 });

    await expect(
      service.revokeUserSession(targetUserId, context),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.revokeActiveRefreshTokens.mock.calls).toHaveLength(0);
  });

  it('is idempotent when user is already revoked and has no active tokens', async () => {
    repository.updateRevokedInScope.mockResolvedValue({ count: 1 });
    repository.revokeActiveRefreshTokens.mockResolvedValue({ count: 0 });

    await expect(
      service.revokeUserSession(targetUserId, context),
    ).resolves.toBeUndefined();
  });
});
