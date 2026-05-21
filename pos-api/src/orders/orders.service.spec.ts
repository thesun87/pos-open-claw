import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Prisma } from '@prisma/client';
import { OrdersService, validateOrderTotals } from './orders.service';
import { SyncOrderDto } from './dto/sync-order.dto';
import { OrdersRepository } from './repositories/orders.repository';
import { SyncLogRepository } from './repositories/sync-log.repository';

const context = {
  tenantId: 't',
  storeId: 's',
  userId: 'u',
  role: 'cashier' as const,
};
const body: SyncOrderDto = {
  clientOrderId: '018f0000-0000-7000-8000-000000009001',
  orderCode: '20260513-POS01-0001',
  deviceId: 'POS01',
  soldAt: '2026-05-13T07:23:11.000Z',
  menuVersionAtSale: 1,
  items: [
    {
      productId: '018f0000-0000-7000-8000-000000000201',
      productNameSnapshot: 'Bạc Xỉu',
      unitPriceSnapshot: 35000,
      quantity: 1,
      options: [
        {
          optionId: '018f0000-0000-7000-8000-000000000403',
          labelSnapshot: 'Size L',
          priceDeltaSnapshot: 5000,
        },
      ],
      lineTotal: 40000,
    },
  ],
  discountAmount: 0,
  total: 40000,
  paymentMethod: 'cash',
};

function service(
  overrides: Partial<{
    replay: unknown;
    create: unknown;
    menuVersion: number;
    createReject: unknown;
    voidResult: unknown;
    listResult: unknown;
    detailResult: unknown;
  }> = {},
) {
  const ordersRepository = {
    currentMenuVersion: jest.fn().mockResolvedValue(overrides.menuVersion ?? 1),
    listOrders: jest.fn().mockResolvedValue(overrides.listResult ?? []),
    findOrderDetail: jest
      .fn()
      .mockResolvedValue(overrides.detailResult ?? null),
    voidOrder: jest.fn().mockResolvedValue(
      overrides.voidResult ?? {
        voidId: '018f0000-0000-7000-8000-00000000v001',
        voidedAt: new Date('2026-05-14T15:03:00.000Z'),
      },
    ),
    createOrderWithSyncLog: jest.fn(
      overrides.createReject
        ? () => Promise.reject(overrides.createReject as Error)
        : () =>
            Promise.resolve(
              overrides.create ?? {
                orderId: 'order-1',
                syncedAt: new Date('2026-05-13T07:23:12.000Z'),
              },
            ),
    ),
  };
  const syncLogRepository = {
    findReplay: jest.fn().mockResolvedValue(overrides.replay ?? null),
  };
  const logger = { setContext: jest.fn(), warn: jest.fn() };
  return {
    svc: new OrdersService(
      ordersRepository as unknown as OrdersRepository,
      syncLogRepository as unknown as SyncLogRepository,
      logger as unknown as PinoLogger,
    ),
    ordersRepository,
    syncLogRepository,
    logger,
  };
}

describe('OrdersService', () => {
  it('creates a new order with sync log', async () => {
    const { svc, ordersRepository } = service();
    await expect(
      svc.syncOrder(context, body.clientOrderId, body),
    ).resolves.toEqual({
      orderId: 'order-1',
      idempotent_replay: false,
      syncedAt: '2026-05-13T07:23:12.000Z',
    });
    expect(ordersRepository.createOrderWithSyncLog).toHaveBeenCalled();
  });

  it('returns replay without creating duplicates', async () => {
    const { svc, ordersRepository } = service({
      replay: { orderId: 'existing' },
    });
    await expect(
      svc.syncOrder(context, body.clientOrderId, body),
    ).resolves.toEqual({ orderId: 'existing', idempotent_replay: true });
    expect(ordersRepository.createOrderWithSyncLog).not.toHaveBeenCalled();
  });

  it('rejects missing context and idempotency mismatch', async () => {
    const { svc } = service();
    await expect(
      svc.syncOrder(undefined, body.clientOrderId, body),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      svc.syncOrder(context, 'different', body),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validates line totals and order total', () => {
    expect(() =>
      validateOrderTotals({
        ...body,
        items: [{ ...body.items[0]!, lineTotal: 1 }],
      }),
    ).toThrow(BadRequestException);
    expect(() => validateOrderTotals({ ...body, total: 1 })).toThrow(
      BadRequestException,
    );
  });

  it('logs stale menu version and still accepts', async () => {
    const { svc, logger } = service({ menuVersion: 2 });
    await svc.syncOrder(context, body.clientOrderId, body);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ clientMenuVersion: 1, serverMenuVersion: 2 }),
      expect.any(String),
    );
  });

  it('recovers P2002 race by reading existing sync log', async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: 'uq_sync_log_tenant_store_device_client' },
    });
    const { svc, syncLogRepository } = service({ createReject: p2002 });
    syncLogRepository.findReplay
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ orderId: 'race-winner' });
    await expect(
      svc.syncOrder(context, body.clientOrderId, body),
    ).resolves.toEqual({ orderId: 'race-winner', idempotent_replay: true });
  });

  it('recovers P2002 raised by the orders scoped idempotency constraint', async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: 'uq_orders_tenant_store_device_client' },
    });
    const { svc, syncLogRepository } = service({ createReject: p2002 });
    syncLogRepository.findReplay
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ orderId: 'order-race-winner' });

    await expect(
      svc.syncOrder(context, body.clientOrderId, body),
    ).resolves.toEqual({
      orderId: 'order-race-winner',
      idempotent_replay: true,
    });
    expect(syncLogRepository.findReplay).toHaveBeenCalledTimes(2);
  });

  it('rethrows unrelated P2002 unique violations', async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: 'uq_sync_log_order_id' },
    });
    const { svc, syncLogRepository } = service({ createReject: p2002 });
    syncLogRepository.findReplay.mockResolvedValueOnce(null);

    await expect(svc.syncOrder(context, body.clientOrderId, body)).rejects.toBe(
      p2002,
    );
    expect(syncLogRepository.findReplay).toHaveBeenCalledTimes(1);
  });

  it('lists orders with order code and Vietnam date boundaries', async () => {
    const { svc, ordersRepository } = service({
      listResult: [{ id: 'order-1' }],
    });
    await expect(
      svc.listOrders(context, {
        order_code: ' POS01 ',
        from: '2026-05-01',
        to: '2026-05-21',
      }),
    ).resolves.toEqual([{ id: 'order-1' }]);
    expect(ordersRepository.listOrders).toHaveBeenCalledWith(context, {
      orderCode: 'POS01',
      from: new Date('2026-04-30T17:00:00.000Z'),
      to: new Date('2026-05-21T16:59:59.999Z'),
    });
  });

  it('rejects reversed list date ranges and missing list context', async () => {
    const { svc, ordersRepository } = service();
    await expect(
      svc.listOrders(context, { from: '2026-05-22', to: '2026-05-21' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.listOrders(undefined, {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(ordersRepository.listOrders).not.toHaveBeenCalled();
  });

  it('returns admin order detail and maps missing detail to not found', async () => {
    const detail = {
      id: '018f0000-0000-7000-8000-000000009999',
      orderCode: 'POS01',
    };
    const { svc } = service({ detailResult: detail });
    await expect(
      svc.getOrderDetail(context, '018f0000-0000-7000-8000-000000009999'),
    ).resolves.toBe(detail);
    const empty = service();
    await expect(
      empty.svc.getOrderDetail(context, '018f0000-0000-7000-8000-000000009999'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('voids an order with trimmed reason and ISO timestamp', async () => {
    const { svc, ordersRepository } = service();
    await expect(
      svc.voidOrder(context, '018f0000-0000-7000-8000-000000009999', {
        reason: '  Khách đổi ý  ',
      }),
    ).resolves.toEqual({
      voidId: '018f0000-0000-7000-8000-00000000v001',
      voidedAt: '2026-05-14T15:03:00.000Z',
    });
    expect(ordersRepository.voidOrder).toHaveBeenCalledWith(
      context,
      '018f0000-0000-7000-8000-000000009999',
      'Khách đổi ý',
    );
  });

  it('rejects void when context is missing or order id is not UUID v7', async () => {
    const { svc, ordersRepository } = service();
    await expect(
      svc.voidOrder(undefined, '018f0000-0000-7000-8000-000000009999', {
        reason: 'abc',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      svc.voidOrder(context, '018f0000-0000-4000-8000-000000009999', {
        reason: 'abc',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(ordersRepository.voidOrder).not.toHaveBeenCalled();
  });

  it('rejects empty product and option snapshot strings in DTO validation', async () => {
    const dto = plainToInstance(SyncOrderDto, {
      ...body,
      items: [
        {
          ...body.items[0]!,
          productNameSnapshot: '',
          options: [{ ...body.items[0]!.options[0]!, labelSnapshot: '' }],
        },
      ],
    });

    const errors = await validate(dto);
    expect(JSON.stringify(errors)).toContain('productNameSnapshot');
    expect(JSON.stringify(errors)).toContain('labelSnapshot');
    expect(JSON.stringify(errors)).toContain('isNotEmpty');
  });
});
