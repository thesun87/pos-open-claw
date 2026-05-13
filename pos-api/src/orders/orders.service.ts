import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import { PROBLEM_TYPES } from '../common/errors/problem-types';
import { SyncOrderDto } from './dto/sync-order.dto';
import { OrdersRepository } from './repositories/orders.repository';
import { SyncLogRepository } from './repositories/sync-log.repository';

export interface SyncOrderResponse {
  orderId: string;
  idempotent_replay: boolean;
  syncedAt?: string;
}

const IDEMPOTENCY_TARGETS = new Set([
  'uq_sync_log_tenant_store_device_client',
  'uq_orders_tenant_store_device_client',
  'SyncLog_tenantId_storeId_deviceId_clientOrderId_key',
  'Order_tenantId_storeId_deviceId_clientOrderId_key',
  'tenant_id_store_id_device_id_client_order_id',
]);

function isSyncLogIdempotencyConflict(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002'
  ) {
    return false;
  }

  const target = error.meta?.target;
  const targetValues = Array.isArray(target) ? target : [target];
  return targetValues.some(
    (value) => typeof value === 'string' && IDEMPOTENCY_TARGETS.has(value),
  );
}

export function validateOrderTotals(body: SyncOrderDto): void {
  const details: string[] = [];
  body.items.forEach((item, index) => {
    const optionsTotal = item.options.reduce(
      (sum, option) => sum + option.priceDeltaSnapshot,
      0,
    );
    const expected = (item.unitPriceSnapshot + optionsTotal) * item.quantity;
    if (expected !== item.lineTotal) {
      details.push(
        `items[${index}].lineTotal expected ${expected} got ${item.lineTotal}`,
      );
    }
  });
  const expectedTotal =
    body.items.reduce((sum, item) => sum + item.lineTotal, 0) -
    body.discountAmount;
  if (expectedTotal !== body.total) {
    details.push(`total expected ${expectedTotal} got ${body.total}`);
  }
  if (details.length) {
    throw new BadRequestException({
      type: PROBLEM_TYPES.validation,
      title: 'Bad Request',
      detail: details.join('; '),
    });
  }
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly syncLogRepository: SyncLogRepository,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(OrdersService.name);
  }

  async syncOrder(
    context: TenantContext | undefined,
    idempotencyKey: string | undefined,
    body: SyncOrderDto,
  ): Promise<SyncOrderResponse> {
    if (!context?.tenantId || !context.storeId || !context.userId) {
      throw new ForbiddenException('Missing tenant context');
    }
    if (idempotencyKey !== body.clientOrderId) {
      throw new BadRequestException({
        type: PROBLEM_TYPES.validation,
        title: 'Bad Request',
        detail: 'Idempotency-Key must equal body.clientOrderId',
      });
    }
    validateOrderTotals(body);

    const replay = await this.syncLogRepository.findReplay(
      context,
      body.deviceId,
      body.clientOrderId,
    );
    if (replay) return { orderId: replay.orderId, idempotent_replay: true };

    const serverMenuVersion =
      await this.ordersRepository.currentMenuVersion(context);
    if (body.menuVersionAtSale < serverMenuVersion) {
      this.logger.warn(
        {
          tenantId: context.tenantId,
          storeId: context.storeId,
          clientOrderId: body.clientOrderId,
          clientMenuVersion: body.menuVersionAtSale,
          serverMenuVersion,
        },
        'accepted stale menu version order snapshot',
      );
    }

    try {
      const created = await this.ordersRepository.createOrderWithSyncLog(
        context,
        body,
      );
      return {
        orderId: created.orderId,
        idempotent_replay: false,
        syncedAt: created.syncedAt.toISOString(),
      };
    } catch (error) {
      if (isSyncLogIdempotencyConflict(error)) {
        const existing = await this.syncLogRepository.findReplay(
          context,
          body.deviceId,
          body.clientOrderId,
        );
        if (existing)
          return { orderId: existing.orderId, idempotent_replay: true };
      }
      throw error;
    }
  }
}
