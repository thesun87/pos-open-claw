import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  TenantContext,
  TenantContext as TenantContextDecorator,
} from '../common/decorators/tenant-context.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UsersService } from '../users/users.service';
import { AuthService, AuthCookies } from './auth.service';
import { LoginDto } from './dto/login.dto';

const REFRESH_COOKIE = 'refresh_token';
const CSRF_COOKIE = 'csrf_token';

function parseCookies(header?: string): Record<string, string> {
  return Object.fromEntries(
    (header ?? '')
      .split(';')
      .map((part) => part.trim().split('=').map(decodeURIComponent))
      .filter(([k, v]) => k && v) as [string, string][],
  );
}

function setAuthCookies(res: Response, cookies: AuthCookies): void {
  res.cookie(REFRESH_COOKIE, cookies.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'test',
    sameSite: 'lax',
    expires: cookies.refreshExpiresAt,
    path: '/api/v1/auth',
  });
  res.cookie(CSRF_COOKIE, cookies.csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'test',
    sameSite: 'lax',
    expires: cookies.refreshExpiresAt,
    path: '/api/v1/auth',
  });
  res.setHeader('X-CSRF-Token', cookies.csrfToken);
}

function clearAuthCookies(res: Response): void {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'test',
    sameSite: 'lax' as const,
    path: '/api/v1/auth',
  };
  res.clearCookie(REFRESH_COOKIE, options);
  res.clearCookie(CSRF_COOKIE, options);
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto.email, dto.password);
    setAuthCookies(res, result.cookies);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async refresh(
    @Req() req: Request,
    @Headers('x-csrf-token') csrfHeader: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = parseCookies(req.headers.cookie);
    try {
      const result = await this.auth.refresh(
        cookies[REFRESH_COOKIE],
        cookies[CSRF_COOKIE],
        csrfHeader,
      );
      setAuthCookies(res, result.cookies);
      return { accessToken: result.accessToken };
    } catch (error) {
      if ((error as { getStatus?: () => number }).getStatus?.() === 401)
        clearAuthCookies(res);
      throw error;
    }
  }

  @Post('sessions/:userId/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(204)
  async revokeSession(
    @Param('userId') userId: string,
    @TenantContextDecorator() context: TenantContext | undefined,
  ): Promise<void> {
    if (!context?.tenantId || !context.storeId)
      throw new ForbiddenException('Missing tenant context');
    await this.users.revokeUserSession(userId, context);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async logout(
    @Req() req: Request & { user?: { sub?: string } },
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const cookies = parseCookies(req.headers.cookie);
    if (req.user?.sub)
      await this.auth.logout(req.user.sub, cookies[REFRESH_COOKIE]);
    clearAuthCookies(res);
  }
}
