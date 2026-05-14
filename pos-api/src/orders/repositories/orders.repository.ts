import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';
import { TenantContext } from '../../common/decorators/tenant-context.decorator';
import { PROBLEM_TYPES } from '../../common/errors/problem-types';
import { runWithTenantContext } from '../../common/middleware/tenant-scope.middleware';
import { PrismaService } from '../../prisma/prisma.service';
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

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  currentMenuVersion(context: TenantContext): Promise<number> {
    return runWithTenantContext(context, async () => {
      const current = await this.prisma.menuVersion.findFirst({
        select: { version: true },
      });
      return current?.version ?? 1;
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
