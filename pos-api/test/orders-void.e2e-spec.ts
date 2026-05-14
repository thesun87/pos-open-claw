/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import request from 'supertest';
import { App } from 'supertest/types';
import { v7 as uuidv7 } from 'uuid';
import { AppModule } from '../src/app.module';
import { PROBLEM_TYPES } from '../src/common/errors/problem-types';
import { ProblemDetailsFilter } from '../src/common/filters/problem-details.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Orders void endpoint (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tenantId: string;
  let storeId: string;
  let otherTenantId: string;
  let otherStoreId: string;
  let cashierId: string;
  let adminToken: string;
  let cashierToken: string;
  let forbiddenToken: string;
  let otherCashierToken: string;
  let seq = 100;

  async function token(
    userId: string,
    role: string,
    t = tenantId,
    s = storeId,
  ): Promise<string> {
    return app.get(JwtService).signAsync(
      {
        sub: userId,
        email: `${userId}@token.local`,
        role,
        tenantId: t,
        storeId: s,
      },
      {
        secret: process.env.JWT_SECRET ?? 'change-me-in-local-env',
        expiresIn: '7d',
      },
    );
  }

  async function createOrder(t = tenantId, s = storeId, userId = cashierId) {
    const orderId = uuidv7();
    const productId = uuidv7();
    const optionId = uuidv7();
    const categoryId = uuidv7();
    await prisma.category.create({
      data: { id: categoryId, tenantId: t, storeId: s, name: `Cat ${seq++}` },
    });
    await prisma.product.create({
      data: {
        id: productId,
        tenantId: t,
        storeId: s,
        categoryId,
        name: `Coffee ${seq}`,
        priceVnd: 40000,
      },
    });
    const optionGroupId = uuidv7();
    await prisma.optionGroup.create({
      data: {
        id: optionGroupId,
        tenantId: t,
        storeId: s,
        name: `Group ${seq}`,
      },
    });
    await prisma.productOptionGroup.create({
      data: { productId, optionGroupId },
    });
    await prisma.option.create({
      data: {
        id: optionId,
        tenantId: t,
        storeId: s,
        optionGroupId,
        name: `Size ${seq}`,
        priceDeltaVnd: 5000,
      },
    });
    await prisma.order.create({
      data: {
        id: orderId,
        tenantId: t,
        storeId: s,
        clientOrderId: uuidv7(),
        orderCode: `E2E-${seq++}`,
        deviceId: 'POS01',
        cashierId: userId,
        soldAt: new Date('2026-05-14T08:00:00.000Z'),
        menuVersionAtSale: 1,
        discountAmount: 0,
        total: 45000,
        paymentMethod: 'Cash',
        items: {
          create: [
            {
              id: uuidv7(),
              productId,
              productNameSnapshot: 'Bạc Xỉu',
              unitPriceSnapshot: 40000,
              quantity: 1,
              lineTotal: 45000,
              options: {
                create: [
                  {
                    id: uuidv7(),
                    optionId,
                    labelSnapshot: 'Size L',
                    priceDeltaSnapshot: 5000,
                  },
                ],
              },
            },
          ],
        },
      },
    });
    return orderId;
  }

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(
      new ProblemDetailsFilter(app.get(HttpAdapterHost), {
        error: jest.fn(),
      } as unknown as PinoLogger),
    );
    await app.init();
    prisma = app.get(PrismaService);
    tenantId = uuidv7();
    storeId = uuidv7();
    otherTenantId = uuidv7();
    otherStoreId = uuidv7();
    cashierId = uuidv7();
    const adminId = uuidv7();
    const otherCashierId = uuidv7();
    for (const [t, s, code] of [
      [tenantId, storeId, 'VOID'],
      [otherTenantId, otherStoreId, 'OTH'],
    ] as const) {
      await prisma.tenant.create({ data: { id: t, name: `Tenant ${code}` } });
      await prisma.store.create({
        data: { id: s, tenantId: t, code, name: `Store ${code}` },
      });
    }
    await prisma.user.createMany({
      data: [
        {
          id: cashierId,
          tenantId,
          storeId,
          email: `${cashierId}@e2e.local`,
          passwordHash: 'x',
          role: 'Cashier',
        },
        {
          id: adminId,
          tenantId,
          storeId,
          email: `${adminId}@e2e.local`,
          passwordHash: 'x',
          role: 'Admin',
        },
        {
          id: otherCashierId,
          tenantId: otherTenantId,
          storeId: otherStoreId,
          email: `${otherCashierId}@e2e.local`,
          passwordHash: 'x',
          role: 'Cashier',
        },
      ],
    });
    cashierToken = await token(cashierId, 'Cashier');
    adminToken = await token(adminId, 'Admin');
    forbiddenToken = await token(uuidv7(), 'Manager');
    otherCashierToken = await token(
      otherCashierId,
      'Cashier',
      otherTenantId,
      otherStoreId,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('inserts only order_voids and leaves original order/items/options unchanged', async () => {
    const orderId = await createOrder();
    const beforeOrder = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    const beforeItems =
      await prisma.$queryRaw`SELECT oi.*, COALESCE(json_agg(oio.* ORDER BY oio.id) FILTER (WHERE oio.id IS NOT NULL), '[]') AS options FROM order_items oi LEFT JOIN order_item_options oio ON oio.order_item_id = oi.id WHERE oi.order_id = ${orderId} GROUP BY oi.id ORDER BY oi.id`;
    const response = await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/void`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ reason: ' Khách đổi ý ' })
      .expect(201);
    expect(response.body.voidId).toBeDefined();
    expect(response.body.voidedAt).toMatch(/Z$/);
    expect(await prisma.orderVoid.count({ where: { orderId } })).toBe(1);
    expect(
      await prisma.order.findUniqueOrThrow({ where: { id: orderId } }),
    ).toEqual(beforeOrder);
    expect(
      await prisma.$queryRaw`SELECT oi.*, COALESCE(json_agg(oio.* ORDER BY oio.id) FILTER (WHERE oio.id IS NOT NULL), '[]') AS options FROM order_items oi LEFT JOIN order_item_options oio ON oio.order_item_id = oi.id WHERE oi.order_id = ${orderId} GROUP BY oi.id ORDER BY oi.id`,
    ).toEqual(beforeItems);
  });

  it('returns 409, 404, 401, and 403 for required void failure paths', async () => {
    const orderId = await createOrder();
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/void`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Nhầm đơn' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/void`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Nhầm đơn' })
      .expect(409)
      .expect(({ body }) =>
        expect(body.type).toBe(PROBLEM_TYPES.alreadyVoided),
      );
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${uuidv7()}/void`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ reason: 'Nhầm đơn' })
      .expect(404)
      .expect(({ body }) => expect(body.type).toBe(PROBLEM_TYPES.notFound));
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/void`)
      .set('Authorization', `Bearer ${otherCashierToken}`)
      .send({ reason: 'Nhầm đơn' })
      .expect(404)
      .expect(({ body }) => expect(body.type).toBe(PROBLEM_TYPES.notFound));
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/void`)
      .send({ reason: 'Nhầm đơn' })
      .expect(401);
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/void`)
      .set('Authorization', `Bearer ${forbiddenToken}`)
      .send({ reason: 'Nhầm đơn' })
      .expect(403);
  });
});
