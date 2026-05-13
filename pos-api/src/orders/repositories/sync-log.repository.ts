import { Injectable } from '@nestjs/common';
import { TenantContext } from '../../common/decorators/tenant-context.decorator';
import { runWithTenantContext } from '../../common/middleware/tenant-scope.middleware';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SyncLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  findReplay(context: TenantContext, deviceId: string, clientOrderId: string) {
    return runWithTenantContext(context, () =>
      this.prisma.syncLog.findFirst({
        where: {
          deviceId,
          clientOrderId,
        },
        select: { orderId: true },
      }),
    );
  }
}
