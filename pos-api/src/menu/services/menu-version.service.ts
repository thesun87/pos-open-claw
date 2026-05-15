import { Injectable } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { TenantContext } from '../../common/decorators/tenant-context.decorator';
import { runWithTenantContext } from '../../common/middleware/tenant-scope.middleware';
import {
  tenantScopedClient,
  TransactionClient,
} from '../repositories/categories.repository';

type MenuVersionClient = TransactionClient;

@Injectable()
export class MenuVersionService {
  async bumpMenuVersion(
    tenantId: string,
    storeId: string,
    client: MenuVersionClient,
  ): Promise<number> {
    const bumpedAt = new Date();
    const context: TenantContext = { tenantId, storeId };
    return runWithTenantContext(context, async () => {
      const row = await tenantScopedClient(client).menuVersion.upsert({
        where: { tenantId_storeId: { tenantId, storeId } },
        create: { id: uuidv7(), tenantId, storeId, version: 1, bumpedAt },
        update: { version: { increment: 1 }, bumpedAt },
        select: { version: true },
      });
      return row.version;
    });
  }
}
