import { Response } from 'express';
import { OrdersController } from './orders.controller';
import { syncOrderExample } from './dto/sync-order.dto';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  it('sets 200 for replay responses', async () => {
    const ordersService: Pick<OrdersService, 'syncOrder'> = {
      syncOrder: jest
        .fn()
        .mockResolvedValue({ orderId: 'x', idempotent_replay: true }),
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
});
