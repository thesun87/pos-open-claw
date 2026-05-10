import { Injectable } from '@nestjs/common';
import { Prisma, RefreshToken, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type AuthUser = Pick<
  User,
  | 'id'
  | 'email'
  | 'passwordHash'
  | 'role'
  | 'tenantId'
  | 'storeId'
  | 'isRevoked'
>;

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string): Promise<AuthUser | null> {
    return this.prisma.user.findFirst({
      where: { email: { equals: email.toLowerCase(), mode: 'insensitive' } },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        tenantId: true,
        storeId: true,
        isRevoked: true,
      },
    });
  }

  findUserById(userId: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        tenantId: true,
        storeId: true,
        isRevoked: true,
      },
    });
  }

  create(data: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data });
  }

  findActiveByUser(userId: string): Promise<RefreshToken[]> {
    return this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findRefreshCandidates(): Promise<RefreshToken[]> {
    return this.prisma.refreshToken.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  revoke(id: string, revokedAt = new Date()): Promise<RefreshToken> {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt },
    });
  }

  rotate(
    oldTokenId: string,
    data: { id: string; userId: string; tokenHash: string; expiresAt: Date },
  ): Promise<RefreshToken> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.refreshToken.update({
        where: { id: oldTokenId },
        data: { revokedAt: new Date() },
      });
      return tx.refreshToken.create({ data });
    });
  }
}
