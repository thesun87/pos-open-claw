import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';
import { TenantContext } from '../../common/decorators/tenant-context.decorator';
import { PROBLEM_TYPES } from '../../common/errors/problem-types';
import { runWithTenantContext } from '../../common/middleware/tenant-scope.middleware';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AdminOrderDetail,
  AdminOrderListItem,
  AdminPaymentMethod,
} from '../dto/admin-order-response.dto';
import { SyncOrderDto } from '../dto/sync-order.dto';

export interface CreatedOrderResult {
  orderId: string;
  syncedAt: Date;
}

export interface VoidedOrderResult {
  voidId: string;
  voidedAt: Date;
}

const paymentMap = {
  cash: PaymentMethod.Cash,
  transfer: PaymentMethod.Transfer,
  card: PaymentMethod.Card,
} as const;

const apiPaymentMap: Record<PaymentMethod, AdminPaymentMethod> = {
  [PaymentMethod.Cash]: 'cash',
  [PaymentMethod.Transfer]: 'transfer',
  [PaymentMethod.Card]: 'card',
};

export type ListOrdersFilters = {
  orderCode?: string;
  from?: Date;
  to?: Date;
};

type OrderWithAdminRelations = Prisma.OrderGetPayload<{
  include: {
    cashier: { select: { email: true } };
    items: { include: { options: true } };
    voids: {
      include: { user: { select: { email: true } } };
      orderBy: { voidedAt: 'desc' };
    };
  };
}>;

function mapOrderListItem(order: OrderWithAdminRelations): AdminOrderListItem {
  const latestVoid = order.voids[0];
  return {
    id: order.id,
    orderCode: order.orderCode,
    soldAt: order.soldAt.toISOString(),
    syncedAt: order.syncedAt.toISOString(),
    cashierName: order.cashier?.email ?? null,
    paymentMethod: apiPaymentMap[order.paymentMethod],
    discountAmount: order.discountAmount,
    total: order.total,
    itemLineCount: order.items.length,
    itemQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
    isVoided: order.voids.length > 0,
    voidedAt: latestVoid?.voidedAt.toISOString() ?? null,
  };
}

function mapOrderDetail(order: OrderWithAdminRelations): AdminOrderDetail {
  return {
    ...mapOrderListItem(order),
    clientOrderId: order.clientOrderId,
    deviceId: order.deviceId,
    menuVersionAtSale: order.menuVersionAtSale,
    voids: order.voids.map((orderVoid) => ({
      id: orderVoid.id,
      reason: orderVoid.reason,
      voidedAt: orderVoid.voidedAt.toISOString(),
      voidedByName: orderVoid.user?.email ?? null,
    })),
    items: order.items.map((item) => ({
      id: item.id,
      productNameSnapshot: item.productNameSnapshot,
      unitPriceSnapshot: item.unitPriceSnapshot,
      quantity: item.quantity,
      note: item.note,
      lineTotal: item.lineTotal,
      options: item.options.map((option) => ({
        id: option.id,
        labelSnapshot: option.labelSnapshot,
        priceDeltaSnapshot: option.priceDeltaSnapshot,
      })),
    })),
  };
}

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  tableExists(context: TenantContext, tableId: string): Promise<boolean> {
    return runWithTenantContext(context, async () => {
      const table = await this.prisma.table.findFirst({
        where: {
          id: tableId,
          tenantId: context.tenantId,
          storeId: context.storeId,
          isActive: true,
        },
        select: { id: true },
      });
      return Boolean(table);
    });
  }

  currentMenuVersion(context: TenantContext): Promise<number> {
    return runWithTenantContext(context, async () => {
      const current = await this.prisma.menuVersion.findFirst({
        select: { version: true },
      });
      return current?.version ?? 1;
    });
  }

  listOrders(
    context: TenantContext,
    filters: ListOrdersFilters,
  ): Promise<AdminOrderListItem[]> {
    return runWithTenantContext(context, async () => {
      const where: Prisma.OrderWhereInput = {
        tenantId: context.tenantId,
        storeId: context.storeId,
      };
      if (filters.orderCode) {
        where.orderCode = { contains: filters.orderCode, mode: 'insensitive' };
      }
      if (filters.from || filters.to) {
        where.soldAt = {
          ...(filters.from ? { gte: filters.from } : {}),
          ...(filters.to ? { lte: filters.to } : {}),
        };
      }

      const orders = await this.prisma.order.findMany({
        where,
        orderBy: [{ soldAt: 'desc' }, { createdAt: 'desc' }],
        take: 200,
        include: {
          cashier: { select: { email: true } },
          items: { include: { options: true } },
          voids: {
            include: { user: { select: { email: true } } },
            orderBy: { voidedAt: 'desc' },
          },
        },
      });
      return orders.map(mapOrderListItem);
    });
  }

  findOrderDetail(
    context: TenantContext,
    orderId: string,
  ): Promise<AdminOrderDetail | null> {
    return runWithTenantContext(context, async () => {
      const order = await this.prisma.order.findFirst({
        where: {
          id: orderId,
          tenantId: context.tenantId,
          storeId: context.storeId,
        },
        include: {
          cashier: { select: { email: true } },
          items: { include: { options: true }, orderBy: { createdAt: 'asc' } },
          voids: {
            include: { user: { select: { email: true } } },
            orderBy: { voidedAt: 'desc' },
          },
        },
      });
      return order ? mapOrderDetail(order) : null;
    });
  }

  createOrderWithSyncLog(
    context: TenantContext,
    body: SyncOrderDto,
  ): Promise<CreatedOrderResult> {
    return runWithTenantContext(context, async () =>
      this.prisma.$transaction(async (tx) => {
        const syncedAt = new Date();
        const order = await tx.order.create({
          data: {
            id: uuidv7(),
            tenantId: context.tenantId,
            storeId: context.storeId,
            clientOrderId: body.clientOrderId,
            orderCode: body.orderCode,
            deviceId: body.deviceId,
            cashierId: context.userId!,
            tableId: body.tableId ?? null,
            tableNameSnapshot: body.tableNameSnapshot ?? null,
            soldAt: new Date(body.soldAt),
            syncedAt,
            menuVersionAtSale: body.menuVersionAtSale,
            discountAmount: body.discountAmount,
            total: body.total,
            paymentMethod: paymentMap[body.paymentMethod],
            items: {
              create: body.items.map((item) => ({
                id: uuidv7(),
                productId: item.productId,
                productNameSnapshot: item.productNameSnapshot,
                unitPriceSnapshot: item.unitPriceSnapshot,
                quantity: item.quantity,
                ...(item.note ? { note: item.note } : {}),
                lineTotal: item.lineTotal,
                options: {
                  create: item.options.map((option) => ({
                    id: uuidv7(),
                    optionId: option.optionId,
                    labelSnapshot: option.labelSnapshot,
                    priceDeltaSnapshot: option.priceDeltaSnapshot,
                  })),
                },
              })),
            },
          },
          select: { id: true, syncedAt: true },
        });
        await tx.syncLog.create({
          data: {
            id: uuidv7(),
            tenantId: context.tenantId,
            storeId: context.storeId,
            deviceId: body.deviceId,
            clientOrderId: body.clientOrderId,
            orderId: order.id,
            firstSyncedAt: syncedAt,
          },
        });
        return { orderId: order.id, syncedAt: order.syncedAt };
      }),
    );
  }

  voidOrder(
    context: TenantContext,
    orderId: string,
    reason: string,
  ): Promise<VoidedOrderResult> {
    return runWithTenantContext(context, async () =>
      this.prisma.$transaction(async (tx) => {
        const order = await tx.order.findFirst({
          where: {
            id: orderId,
            tenantId: context.tenantId,
            storeId: context.storeId,
          },
          select: { id: true },
        });
        if (!order) {
          throw new NotFoundException({
            type: PROBLEM_TYPES.notFound,
            title: 'Not Found',
            detail: 'Order not found',
          });
        }

        const existingVoid = await tx.orderVoid.findFirst({
          where: { orderId },
          select: { id: true },
        });
        if (existingVoid) {
          throw new ConflictException({
            type: PROBLEM_TYPES.alreadyVoided,
            title: 'Đơn đã được hủy',
            detail: 'Đơn đã được hủy',
          });
        }

        const voidedAt = new Date();
        const orderVoid = await tx.orderVoid.create({
          data: {
            id: uuidv7(),
            orderId,
            voidedBy: context.userId!,
            reason,
            voidedAt,
          },
          select: { id: true, voidedAt: true },
        });
        return { voidId: orderVoid.id, voidedAt: orderVoid.voidedAt };
      }),
    );
  }
}
