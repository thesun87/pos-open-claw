import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import { PROBLEM_TYPES } from '../common/errors/problem-types';
import { isUuidV7 } from '../common/utils/trace-id';
import {
  AdminOrderDetail,
  AdminOrderListItem,
} from './dto/admin-order-response.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { SyncOrderDto } from './dto/sync-order.dto';
import { VoidOrderDto } from './dto/void-order.dto';
import { OrdersRepository } from './repositories/orders.repository';
import { SyncLogRepository } from './repositories/sync-log.repository';

export interface SyncOrderResponse {
  orderId: string;
  idempotent_replay: boolean;
  syncedAt?: string;
}

export interface VoidOrderResponse {
  voidId: string;
  voidedAt: string;
}

const VIETNAM_TIMEZONE_OFFSET_MS = 7 * 60 * 60 * 1000;

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

function vietnamDateBoundary(value: string, endOfDay: boolean): Date {
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const utcMs = Date.UTC(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
  return new Date(utcMs - VIETNAM_TIMEZONE_OFFSET_MS);
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

  private assertTenantContext(
    context: TenantContext | undefined,
  ): asserts context is TenantContext {
    if (!context?.tenantId || !context.storeId) {
      throw new ForbiddenException('Missing tenant context');
    }
  }

  async listOrders(
    context: TenantContext | undefined,
    query: ListOrdersQueryDto,
  ): Promise<AdminOrderListItem[]> {
    this.assertTenantContext(context);
    const orderCode = (query.order_code ?? query.search)?.trim();
    const from = query.from
      ? vietnamDateBoundary(query.from, false)
      : undefined;
    const to = query.to ? vietnamDateBoundary(query.to, true) : undefined;
    if (from && to && from > to) {
      throw new BadRequestException({
        type: PROBLEM_TYPES.validation,
        title: 'Bad Request',
        detail: 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc',
      });
    }
    return this.ordersRepository.listOrders(context, {
      ...(orderCode ? { orderCode } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });
  }

  async getOrderDetail(
    context: TenantContext | undefined,
    orderId: string,
  ): Promise<AdminOrderDetail> {
    this.assertTenantContext(context);
    if (!isUuidV7(orderId)) {
      throw new BadRequestException({
        type: PROBLEM_TYPES.validation,
        title: 'Bad Request',
        detail: 'order id must be a UUID v7',
      });
    }
    const detail = await this.ordersRepository.findOrderDetail(
      context,
      orderId,
    );
    if (!detail) {
      throw new NotFoundException({
        type: PROBLEM_TYPES.notFound,
        title: 'Not Found',
        detail: 'Order not found',
      });
    }
    return detail;
  }

  private validateTablePair(body: SyncOrderDto): void {
    const tableId = body.tableId ?? null;
    const tableNameSnapshot = body.tableNameSnapshot ?? null;
    if ((tableId === null) !== (tableNameSnapshot === null)) {
      throw new BadRequestException({
        type: PROBLEM_TYPES.validation,
        title: 'Bad Request',
        detail:
          'tableId và tableNameSnapshot phải cùng null hoặc cùng non-null',
      });
    }
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

    this.validateTablePair(body);
    if (body.tableId !== null && body.tableId !== undefined) {
      const tableExists = await this.ordersRepository.tableExists(
        context,
        body.tableId,
      );
      if (!tableExists) {
        throw new BadRequestException({
          type: PROBLEM_TYPES.validation,
          title: 'Bad Request',
          detail: 'Table không thuộc store',
        });
      }
    }

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

  async voidOrder(
    context: TenantContext | undefined,
    orderId: string,
    body: VoidOrderDto,
  ): Promise<VoidOrderResponse> {
    if (!context?.tenantId || !context.storeId || !context.userId) {
      throw new ForbiddenException('Missing tenant context');
    }
    if (!isUuidV7(orderId)) {
      throw new BadRequestException({
        type: PROBLEM_TYPES.validation,
        title: 'Bad Request',
        detail: 'order id must be a UUID v7',
      });
    }

    const result = await this.ordersRepository.voidOrder(
      context,
      orderId,
      body.reason.trim(),
    );
    return { voidId: result.voidId, voidedAt: result.voidedAt.toISOString() };
  }
}
