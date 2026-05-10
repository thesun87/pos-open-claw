/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/unbound-method */
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

const context = (authorization?: string) => {
  const req: any = { headers: { authorization } };
  return {
    req,
    ctx: { switchToHttp: () => ({ getRequest: () => req }) } as any,
  };
};

describe('JwtAuthGuard', () => {
  it('verifies bearer token and attaches user/context', async () => {
    const jwt = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: 'u1',
        tenantId: 't1',
        storeId: 's1',
        role: 'admin',
      }),
    } as unknown as JwtService;
    const { req, ctx } = context('Bearer abc');
    await expect(new JwtAuthGuard(jwt).canActivate(ctx)).resolves.toBe(true);
    expect(jwt.verifyAsync).toHaveBeenCalledWith('abc', expect.any(Object));
    expect(req.user.sub).toBe('u1');
    expect(req.tenantContext).toMatchObject({ tenantId: 't1', storeId: 's1' });
  });

  it('rejects missing or invalid token', async () => {
    await expect(
      new JwtAuthGuard({ verifyAsync: jest.fn() } as any).canActivate(
        context().ctx,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      new JwtAuthGuard({
        verifyAsync: jest.fn().mockRejectedValue(new Error('bad')),
      } as any).canActivate(context('Bearer bad').ctx),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
