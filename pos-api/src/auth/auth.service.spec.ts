/* eslint-disable @typescript-eslint/unbound-method */
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';

jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));

const user = {
  id: '018f0000-0000-7000-8000-000000000001',
  email: 'cashier@cafe.demo',
  passwordHash: 'hash',
  role: 'Cashier' as const,
  tenantId: '018f0000-0000-7000-8000-000000000002',
  storeId: '018f0000-0000-7000-8000-000000000003',
  isRevoked: false,
};

function setup() {
  const repo = {
    findUserByEmail: jest.fn(),
    findUserById: jest.fn(),
    create: jest.fn(),
    findRefreshCandidates: jest.fn(),
    rotate: jest.fn(),
    findActiveByUser: jest.fn(),
    revoke: jest.fn(),
  } as unknown as jest.Mocked<RefreshTokenRepository>;
  const jwt = {
    signAsync: jest.fn().mockResolvedValue('jwt'),
  } as unknown as jest.Mocked<JwtService>;
  return { repo, jwt, service: new AuthService(repo, jwt) };
}

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');
  });

  it('logs in with bcrypt, stores hashed refresh token, and signs 7 day JWT', async () => {
    const { service, repo, jwt } = setup();
    repo.findUserByEmail.mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const result = await service.login('Cashier@Cafe.Demo', 'Cashier@123!');
    expect(repo.findUserByEmail).toHaveBeenCalledWith('cashier@cafe.demo');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: user.id, tokenHash: 'hashed-refresh' }),
    );
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: user.id, tenantId: user.tenantId }),
      expect.objectContaining({ expiresIn: 604800 }),
    );
    expect(result).toMatchObject({
      accessToken: 'jwt',
      user: { email: user.email },
    });
    expect(result.cookies.refreshToken).toBeDefined();
  });

  it('uses same invalid credentials error for missing user and bad password', async () => {
    const { service, repo } = setup();
    repo.findUserByEmail.mockResolvedValue(null);
    await expect(service.login('none@cafe.demo', 'x')).rejects.toMatchObject({
      problemType: 'https://pos.example/errors/invalid-credentials',
    });
    repo.findUserByEmail.mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await expect(service.login(user.email, 'bad')).rejects.toMatchObject({
      problemType: 'https://pos.example/errors/invalid-credentials',
    });
  });

  it('rejects csrf mismatch without rotating', async () => {
    const { service, repo } = setup();
    await expect(service.refresh('raw', 'a', 'b')).rejects.toMatchObject({
      problemType: 'https://pos.example/errors/csrf-failed',
    });
    expect(repo.rotate).not.toHaveBeenCalled();
  });

  it('rotates a valid refresh token and revokes old row', async () => {
    const { service, repo } = setup();
    repo.findRefreshCandidates.mockResolvedValue([
      {
        id: 'old',
        userId: user.id,
        tokenHash: 'old-hash',
        expiresAt: new Date(Date.now() + 1000),
        revokedAt: null,
      } as any,
    ]);
    repo.findUserById.mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const result = await service.refresh('raw', 'csrf', 'csrf');
    expect(repo.rotate).toHaveBeenCalledWith(
      'old',
      expect.objectContaining({ userId: user.id, tokenHash: 'hashed-refresh' }),
    );
    expect(result.accessToken).toBe('jwt');
  });

  it('classifies a matching revoked refresh token as session-revoked', async () => {
    const { service, repo } = setup();
    repo.findRefreshCandidates.mockResolvedValue([
      {
        id: 'old',
        userId: user.id,
        tokenHash: 'old-hash',
        expiresAt: new Date(Date.now() + 1000),
        revokedAt: new Date(),
      } as any,
    ]);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    await expect(service.refresh('raw', 'csrf', 'csrf')).rejects.toMatchObject({
      problemType: 'https://pos.example/errors/session-revoked',
    });
    expect(repo.rotate).not.toHaveBeenCalled();
  });

  it('revokes matching refresh token during logout', async () => {
    const { service, repo } = setup();
    repo.findActiveByUser.mockResolvedValue([
      { id: 'tok', tokenHash: 'hash' } as any,
    ]);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    await service.logout(user.id, 'raw');
    expect(repo.revoke).toHaveBeenCalledWith('tok');
  });
});
