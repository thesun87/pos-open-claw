import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../common/decorators/tenant-context.decorator';

export type ScopedUser = Pick<
  User,
  'id' | 'tenantId' | 'storeId' | 'isRevoked'
>;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  updateRevokedInScope(
    targetUserId: string,
    context: TenantContext,
    isRevoked: boolean,
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.user.updateMany({
      where: {
        id: targetUserId,
        tenantId: context.tenantId,
        storeId: context.storeId,
      },
      data: { isRevoked },
    });
  }

  revokeActiveRefreshTokens(
    targetUserId: string,
    revokedAt: Date,
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.refreshToken.updateMany({
      where: { userId: targetUserId, revokedAt: null },
      data: { revokedAt },
    });
  }
}
