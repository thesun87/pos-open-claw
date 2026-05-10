/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const ctx = (role?: string) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    }) as any;
  it('allows matching normalized role and open routes', () => {
    expect(
      new RolesGuard({
        getAllAndOverride: () => undefined,
      } as unknown as Reflector).canActivate(ctx()),
    ).toBe(true);
    expect(
      new RolesGuard({
        getAllAndOverride: () => ['admin'],
      } as unknown as Reflector).canActivate(ctx('Admin')),
    ).toBe(true);
  });
  it('denies missing/wrong role', () => {
    expect(() =>
      new RolesGuard({
        getAllAndOverride: () => ['cashier'],
      } as unknown as Reflector).canActivate(ctx('admin')),
    ).toThrow(ForbiddenException);
  });
});
