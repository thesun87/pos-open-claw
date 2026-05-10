import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

interface JwtPayload {
  sub?: string;
  tenantId?: string;
  storeId?: string;
  role?: string;
  [key: string]: unknown;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: unknown; tenantContext?: unknown }>();
    const token = this.extractBearerToken(request);
    if (!token) throw new UnauthorizedException('Missing bearer token');
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env.JWT_SECRET ?? 'change-me-in-local-env',
      });
      request.user = payload;
      if (payload?.tenantId && payload?.storeId) {
        request.tenantContext = {
          tenantId: payload.tenantId,
          storeId: payload.storeId,
          userId: payload.sub,
          role: payload.role,
        };
      }
      return true;
    } catch {
      throw new UnauthorizedException('Invalid bearer token');
    }
  }

  private extractBearerToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' && token ? token : undefined;
  }
}
