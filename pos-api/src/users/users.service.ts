import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import { UsersRepository } from './repositories/users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  async revokeUserSession(
    targetUserId: string,
    context: TenantContext,
  ): Promise<void> {
    const now = new Date();
    const updated = await this.users.updateRevokedInScope(
      targetUserId,
      context,
      true,
    );
    if (updated.count === 0) throw new NotFoundException('User not found');
    await this.users.revokeActiveRefreshTokens(targetUserId, now);
  }
}
