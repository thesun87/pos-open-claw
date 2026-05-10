import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { v7 as uuidv7 } from 'uuid';
import { PROBLEM_TYPES } from '../common/errors/problem-types';
import { AuthProblemException } from '../common/errors/auth-problem.exception';
import {
  AuthUser,
  RefreshTokenRepository,
} from './repositories/refresh-token.repository';

const ACCESS_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const BCRYPT_COST = 12;

export interface AuthCookies {
  refreshToken: string;
  csrfToken: string;
  refreshExpiresAt: Date;
}

export interface AuthResult {
  accessToken: string;
  user: Pick<AuthUser, 'id' | 'email' | 'role' | 'tenantId' | 'storeId'>;
  cookies: AuthCookies;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly tokens: RefreshTokenRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.tokens.findUserByEmail(email.trim().toLowerCase());
    if (!user || user.isRevoked) throw this.invalidCredentials();
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw this.invalidCredentials();
    const cookies = await this.issueRefreshToken(user.id);
    return {
      accessToken: await this.signAccessToken(user),
      user: this.publicUser(user),
      cookies,
    };
  }

  async refresh(
    rawRefreshToken: string | undefined,
    csrfCookie: string | undefined,
    csrfHeader: string | undefined,
  ): Promise<{ accessToken: string; cookies: AuthCookies }> {
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      throw new AuthProblemException(
        HttpStatus.FORBIDDEN,
        PROBLEM_TYPES.csrfFailed,
        'CSRF token không hợp lệ',
        'CSRF token không hợp lệ',
      );
    }
    if (!rawRefreshToken) throw this.sessionExpired();
    const match = await this.findMatchingToken(rawRefreshToken);
    if (!match) throw this.sessionExpired();
    if (match.token.revokedAt) throw this.sessionRevoked();
    if (match.token.expiresAt.getTime() <= Date.now())
      throw this.sessionExpired();
    const user = await this.tokens.findUserById(match.token.userId);
    if (!user || user.isRevoked) throw this.sessionRevoked();
    const next = this.generateRefreshMaterial();
    const tokenHash = await bcrypt.hash(next.refreshToken, BCRYPT_COST);
    await this.tokens.rotate(match.token.id, {
      id: uuidv7(),
      userId: user.id,
      tokenHash,
      expiresAt: next.refreshExpiresAt,
    });
    return { accessToken: await this.signAccessToken(user), cookies: next };
  }

  async logout(userId: string, rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;
    const candidates = await this.tokens.findActiveByUser(userId);
    for (const token of candidates) {
      if (await bcrypt.compare(rawRefreshToken, token.tokenHash)) {
        await this.tokens.revoke(token.id);
        return;
      }
    }
  }

  private async issueRefreshToken(userId: string): Promise<AuthCookies> {
    const material = this.generateRefreshMaterial();
    await this.tokens.create({
      id: uuidv7(),
      userId,
      tokenHash: await bcrypt.hash(material.refreshToken, BCRYPT_COST),
      expiresAt: material.refreshExpiresAt,
    });
    return material;
  }

  private generateRefreshMaterial(): AuthCookies {
    return {
      refreshToken: randomBytes(32).toString('base64url'),
      csrfToken: randomBytes(32).toString('base64url'),
      refreshExpiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    };
  }

  private async findMatchingToken(rawRefreshToken: string) {
    // MVP lookup: users are few; tokens remain hashed, never queried raw.
    // Include revoked/expired rows so refresh can return the precise AC6 problem type.
    const candidates = await this.tokens.findRefreshCandidates();
    for (const token of candidates) {
      if (await bcrypt.compare(rawRefreshToken, token.tokenHash))
        return { token };
    }
    return null;
  }

  private signAccessToken(user: AuthUser): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        storeId: user.storeId,
      },
      {
        secret: process.env.JWT_SECRET ?? 'change-me-in-local-env',
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      },
    );
  }

  private publicUser(user: AuthUser) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      storeId: user.storeId,
    };
  }

  private invalidCredentials() {
    return new AuthProblemException(
      HttpStatus.UNAUTHORIZED,
      PROBLEM_TYPES.invalidCredentials,
      'Sai email hoặc mật khẩu',
      'Sai email hoặc mật khẩu',
    );
  }

  private sessionRevoked() {
    return new AuthProblemException(
      HttpStatus.UNAUTHORIZED,
      PROBLEM_TYPES.sessionRevoked,
      'Phiên đăng nhập đã bị thu hồi',
      'Phiên đăng nhập đã bị thu hồi',
    );
  }

  private sessionExpired() {
    return new AuthProblemException(
      HttpStatus.UNAUTHORIZED,
      PROBLEM_TYPES.sessionExpired,
      'Phiên đăng nhập đã hết hạn',
      'Phiên đăng nhập đã hết hạn',
    );
  }
}
