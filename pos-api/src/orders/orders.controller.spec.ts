import { Response } from 'express';
import { OrdersController } from './orders.controller';
import { syncOrderExample } from './dto/sync-order.dto';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  it('sets 200 for replay responses', async () => {
    const ordersService: Pick<
      OrdersService,
      'syncOrder' | 'voidOrder' | 'listOrders' | 'getOrderDetail'
    > = {
      syncOrder: jest
        .fn()
        .mockResolvedValue({ orderId: 'x', idempotent_replay: true }),
      voidOrder: jest.fn(),
      listOrders: jest.fn(),
      getOrderDetail: jest.fn(),
    };
    const controller = new OrdersController(ordersService as OrdersService);
    const status = jest.fn();
    const res = { status } as unknown as Response;
    await expect(
      controller.create(
        { tenantId: 't', storeId: 's', userId: 'u' },
        syncOrderExample.clientOrderId,
        {
          ...syncOrderExample,
          items: syncOrderExample.items.map((item) => ({
            ...item,
            options: item.options.map((option) => ({ ...option })),
          })),
        },
        res,
      ),
    ).resolves.toEqual({ orderId: 'x', idempotent_replay: true });
    expect(status).toHaveBeenCalledWith(200);
  });

  it('delegates list and detail requests to the service', async () => {
    const ordersService: Pick<
      OrdersService,
      'syncOrder' | 'voidOrder' | 'listOrders' | 'getOrderDetail'
    > = {
      syncOrder: jest.fn(),
      voidOrder: jest.fn(),
      listOrders: jest.fn().mockResolvedValue([{ id: 'order-1' }]),
      getOrderDetail: jest.fn().mockResolvedValue({ id: 'order-1' }),
    };
    const controller = new OrdersController(ordersService as OrdersService);
    const context = { tenantId: 't', storeId: 's', userId: 'u' };
    await expect(
      controller.list(context, { order_code: 'POS01' }),
    ).resolves.toEqual([{ id: 'order-1' }]);
    await expect(
      controller.detail(context, '018f0000-0000-7000-8000-000000009999'),
    ).resolves.toEqual({ id: 'order-1' });
    expect(ordersService.listOrders).toHaveBeenCalledWith(context, {
      order_code: 'POS01',
    });
    expect(ordersService.getOrderDetail).toHaveBeenCalledWith(
      context,
      '018f0000-0000-7000-8000-000000009999',
    );
  });

  it('delegates void requests to the service and returns 201 body shape', async () => {
    const ordersService: Pick<
      OrdersService,
      'syncOrder' | 'voidOrder' | 'listOrders' | 'getOrderDetail'
    > = {
      syncOrder: jest.fn(),
      voidOrder: jest.fn().mockResolvedValue({
        voidId: '018f0000-0000-7000-8000-000000008888',
        voidedAt: '2026-05-14T15:03:00.000Z',
      }),
      listOrders: jest.fn(),
      getOrderDetail: jest.fn(),
    };
    const controller = new OrdersController(ordersService as OrdersService);
    const context = { tenantId: 't', storeId: 's', userId: 'u' };

    await expect(
      controller.void(context, '018f0000-0000-7000-8000-000000009999', {
        reason: 'Khách đổi ý',
      }),
    ).resolves.toEqual({
      voidId: '018f0000-0000-7000-8000-000000008888',
      voidedAt: '2026-05-14T15:03:00.000Z',
    });
    expect(ordersService.voidOrder).toHaveBeenCalledWith(
      context,
      '018f0000-0000-7000-8000-000000009999',
      { reason: 'Khách đổi ý' },
    );
  });
});
