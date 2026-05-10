import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
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
  constructor(private readonly auth: AuthService) {}

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
