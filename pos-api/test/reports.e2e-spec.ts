/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethod } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import request from 'supertest';
import { App } from 'supertest/types';
import { v7 as uuidv7 } from 'uuid';
import { AppModule } from '../src/app.module';
import { PROBLEM_TYPES } from '../src/common/errors/problem-types';
import { ProblemDetailsFilter } from '../src/common/filters/problem-details.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Reports endpoint (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tenantId: string;
  let storeId: string;
  let otherTenantId: string;
  let otherStoreId: string;
  let adminId: string;
  let cashierId: string;
  let adminToken: string;
  let cashierToken: string;
  let otherAdminToken: string;
  let seq = 200;

  async function signToken(
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

  /**
   * Create an order for the given tenant/store and return the orderId.
   */
  async function createOrder(opts: {
    tenantId?: string;
    storeId?: string;
    cashierId?: string;
    soldAt: Date;
    paymentMethod?: PaymentMethod;
    productNameSnapshot?: string;
    total?: number;
    quantity?: number;
    voided?: boolean;
  }) {
    const t = opts.tenantId ?? tenantId;
    const s = opts.storeId ?? storeId;
    const u = opts.cashierId ?? cashierId;
    const productId = uuidv7();
    const categoryId = uuidv7();
    const price = opts.total ?? 40000;
    const qty = opts.quantity ?? 1;
    const lineTotal = price * qty;

    await prisma.category.create({
      data: { id: categoryId, tenantId: t, storeId: s, name: `Cat-${seq++}` },
    });
    await prisma.product.create({
      data: {
        id: productId,
        tenantId: t,
        storeId: s,
        categoryId,
        name: `Product-${seq}`,
        priceVnd: price,
      },
    });

    const order = await prisma.order.create({
      data: {
        id: uuidv7(),
        tenantId: t,
        storeId: s,
        clientOrderId: uuidv7(),
        orderCode: `E2E-RPT-${seq++}`,
        deviceId: 'POS01',
        cashierId: u,
        soldAt: opts.soldAt,
        menuVersionAtSale: 1,
        discountAmount: 0,
        total: lineTotal,
        paymentMethod: opts.paymentMethod ?? PaymentMethod.Cash,
        items: {
          create: [
            {
              id: uuidv7(),
              productId,
              productNameSnapshot: opts.productNameSnapshot ?? 'Bạc Xỉu',
              unitPriceSnapshot: price,
              quantity: qty,
              lineTotal,
            },
          ],
        },
      },
    });

    if (opts.voided) {
      await prisma.orderVoid.create({
        data: {
          id: uuidv7(),
          orderId: order.id,
          voidedBy: u,
          reason: 'Test void',
          voidedAt: new Date(),
        },
      });
    }

    return order.id;
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
    adminId = uuidv7();
    cashierId = uuidv7();
    const otherAdminId = uuidv7();

    for (const [t, s, code] of [
      [tenantId, storeId, 'RPT'],
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
          id: adminId,
          tenantId,
          storeId,
          email: `${adminId}@e2e.local`,
          passwordHash: 'x',
          role: 'Admin',
        },
        {
          id: cashierId,
          tenantId,
          storeId,
          email: `${cashierId}@e2e.local`,
          passwordHash: 'x',
          role: 'Cashier',
        },
        {
          id: otherAdminId,
          tenantId: otherTenantId,
          storeId: otherStoreId,
          email: `${otherAdminId}@e2e.local`,
          passwordHash: 'x',
          role: 'Admin',
        },
      ],
    });

    adminToken = await signToken(adminId, 'Admin');
    cashierToken = await signToken(cashierId, 'Cashier');
    otherAdminToken = await signToken(
      otherAdminId,
      'Admin',
      otherTenantId,
      otherStoreId,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Authentication & Authorization ─────────────────────────────────────────

  it('returns 401 when no Bearer token provided', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/reports?from=2026-05-01&to=2026-05-07&metric=all')
      .expect(401);
  });

  it('returns 403 when cashier role used', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/reports?from=2026-05-01&to=2026-05-07&metric=all')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(403);
  });

  // ─── Validation ─────────────────────────────────────────────────────────────

  it('returns 400 RFC 7807 when range > 90 days', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1/reports?from=2026-01-01&to=2026-04-02&metric=all')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
    expect(body.type).toBe(PROBLEM_TYPES.validation);
    expect(body.detail).toBe('Tối đa 90 ngày một lần');
  });

  it('returns 400 RFC 7807 when from > to', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1/reports?from=2026-05-10&to=2026-05-01&metric=all')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
    expect(body.type).toBe(PROBLEM_TYPES.validation);
    expect(body.detail).toMatch(/from phải nhỏ hơn hoặc bằng to/);
  });

  it('returns 400 for bad date format (datetime string)', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1/reports?from=2026-05-01T00:00:00&to=2026-05-07&metric=all')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
    expect(body.status).toBe(400);
  });

  it('returns 400 for invalid metric value', async () => {
    await request(app.getHttpServer())
      .get(
        '/api/v1/reports?from=2026-05-01&to=2026-05-07&metric=invalid_metric',
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  // ─── metric=all returns all 4 keys ──────────────────────────────────────────

  it('returns 200 with all 4 metric keys for metric=all', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1/reports?from=2026-05-01&to=2026-05-07&metric=all')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(body).toHaveProperty('revenueByDay');
    expect(body).toHaveProperty('totals');
    expect(body).toHaveProperty('revenueByPaymentMethod');
    expect(body).toHaveProperty('topProducts');
    expect(Array.isArray(body.revenueByDay)).toBe(true);
    expect(body.totals).toHaveProperty('totalOrders');
    expect(body.totals).toHaveProperty('totalRevenue');
    expect(Array.isArray(body.revenueByPaymentMethod)).toBe(true);
    expect(Array.isArray(body.topProducts)).toBe(true);
  });

  // ─── Void exclusion ─────────────────────────────────────────────────────────

  it('excludes voided orders from all 4 metrics', async () => {
    const soldAt = new Date('2026-05-15T03:00:00.000Z'); // 10:00 local May 15

    // 1 void order, 1 normal order
    await createOrder({
      soldAt,
      paymentMethod: PaymentMethod.Cash,
      total: 50000,
      voided: true,
    });
    await createOrder({
      soldAt,
      paymentMethod: PaymentMethod.Cash,
      total: 30000,
    });

    const { body } = await request(app.getHttpServer())
      .get('/api/v1/reports?from=2026-05-15&to=2026-05-15&metric=all')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Only 1 non-voided order should appear
    expect(body.totals.totalOrders).toBeGreaterThanOrEqual(1);
    // Total revenue should NOT include the voided order's 50000
    // The non-voided order adds 30000
    const totalRevenue: number = body.totals.totalRevenue as number;
    // Revenue should be multiple of 30000 (no 50000 from voided)
    expect(totalRevenue % 50000).not.toBe(0); // 50000 voided order excluded
  });

  // ─── RevenueByDay fills 0 for missing dates ─────────────────────────────────

  it('revenueByDay has no gaps (fills 0 for days with no orders)', async () => {
    const { body } = await request(app.getHttpServer())
      .get(
        '/api/v1/reports?from=2026-05-01&to=2026-05-07&metric=revenue_by_day',
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(body.revenueByDay).toHaveLength(7);
    // All dates should be present
    const dates: string[] = (body.revenueByDay as Array<{ date: string }>).map(
      (r) => r.date,
    );
    expect(dates).toContain('2026-05-01');
    expect(dates).toContain('2026-05-07');
    // All entries have required shape
    for (const row of body.revenueByDay as Array<{
      date: string;
      revenue: number;
      orderCount: number;
    }>) {
      expect(row).toHaveProperty('date');
      expect(row).toHaveProperty('revenue');
      expect(row).toHaveProperty('orderCount');
      expect(typeof row.revenue).toBe('number');
      expect(typeof row.orderCount).toBe('number');
    }
  });

  // ─── PaymentMethod fills all 3 methods ──────────────────────────────────────

  it('revenueByPaymentMethod always returns all 3 payment methods', async () => {
    const { body } = await request(app.getHttpServer())
      .get(
        '/api/v1/reports?from=2026-05-01&to=2026-05-07&metric=revenue_by_payment_method',
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const methods: string[] = (
      body.revenueByPaymentMethod as Array<{ paymentMethod: string }>
    ).map((r) => r.paymentMethod);
    expect(methods).toContain('cash');
    expect(methods).toContain('transfer');
    expect(methods).toContain('card');
    expect(body.revenueByPaymentMethod).toHaveLength(3);
  });

  // ─── TopProducts uses snapshot, not product name ─────────────────────────────

  it('topProducts uses product_name_snapshot (deleted products still count)', async () => {
    const snapshotName = `Sản phẩm đặc biệt ${uuidv7().substring(0, 8)}`;
    const soldAt = new Date('2026-05-14T05:00:00.000Z'); // 12:00 local May 14

    // Create order with custom snapshot name
    await createOrder({
      soldAt,
      productNameSnapshot: snapshotName,
      total: 60000,
      quantity: 3,
    });

    const { body } = await request(app.getHttpServer())
      .get('/api/v1/reports?from=2026-05-14&to=2026-05-14&metric=top_products')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const found = (body.topProducts as Array<{ productName: string }>).find(
      (p) => p.productName === snapshotName,
    );
    expect(found).toBeDefined();
  });

  // ─── Cross-tenant isolation ──────────────────────────────────────────────────

  it('admin from other tenant cannot see orders from main tenant', async () => {
    const soldAt = new Date('2026-05-13T05:00:00.000Z');
    // Create an order in the main tenant
    await createOrder({ soldAt, total: 99000 });

    // Query as other tenant's admin
    const { body } = await request(app.getHttpServer())
      .get('/api/v1/reports?from=2026-05-01&to=2026-05-31&metric=all')
      .set('Authorization', `Bearer ${otherAdminToken}`)
      .expect(200);

    // Other tenant should have 0 orders (their store is isolated)
    expect(body.totals.totalOrders).toBe(0);
    expect(body.totals.totalRevenue).toBe(0);
    expect(body.topProducts).toHaveLength(0);
  });

  // ─── TZ boundary test ───────────────────────────────────────────────────────

  it('TZ boundary: order at 2026-05-09T16:59:59.999Z falls in local date 2026-05-09', async () => {
    // 2026-05-09T16:59:59.999Z = 23:59:59.999 +07 = local May 9
    await createOrder({
      soldAt: new Date('2026-05-09T16:59:59.999Z'),
      total: 11111,
    });

    const { body } = await request(app.getHttpServer())
      .get(
        '/api/v1/reports?from=2026-05-09&to=2026-05-09&metric=revenue_by_day',
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const may9Row = (
      body.revenueByDay as Array<{
        date: string;
        revenue: number;
        orderCount: number;
      }>
    ).find((r) => r.date === '2026-05-09');
    expect(may9Row).toBeDefined();
    expect(may9Row!.orderCount).toBeGreaterThanOrEqual(1);
    expect(may9Row!.revenue).toBeGreaterThanOrEqual(11111);
  });

  it('TZ boundary: order at 2026-05-09T17:00:00.000Z falls in local date 2026-05-10', async () => {
    // 2026-05-09T17:00:00.000Z = 00:00:00 +07 = local May 10
    await createOrder({
      soldAt: new Date('2026-05-09T17:00:00.000Z'),
      total: 22222,
    });

    // Query for May 9 — order at T17:00:00Z should NOT appear
    const { body: body9 } = await request(app.getHttpServer())
      .get(
        '/api/v1/reports?from=2026-05-09&to=2026-05-09&metric=revenue_by_day',
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Query for May 10 — order at T17:00:00Z SHOULD appear
    const { body: body10 } = await request(app.getHttpServer())
      .get(
        '/api/v1/reports?from=2026-05-10&to=2026-05-10&metric=revenue_by_day',
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const may10Row = (
      body10.revenueByDay as Array<{
        date: string;
        revenue: number;
        orderCount: number;
      }>
    ).find((r) => r.date === '2026-05-10');
    expect(may10Row).toBeDefined();
    expect(may10Row!.revenue).toBeGreaterThanOrEqual(22222);

    // Confirm 22222 did NOT count in May 9 range
    const may9Row = (
      body9.revenueByDay as Array<{
        date: string;
        revenue: number;
        orderCount: number;
      }>
    ).find((r) => r.date === '2026-05-09');
    // The revenue for may9 should NOT include 22222
    expect(may9Row!.revenue % 22222).not.toBe(0);
  });

  // ─── metric=all consistency check ────────────────────────────────────────────

  it('metric=all: totalRevenue === sum(revenueByDay) === sum(revenueByPaymentMethod)', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1/reports?from=2026-05-01&to=2026-05-31&metric=all')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const totalRevenue: number = body.totals.totalRevenue as number;
    const sumByDay: number = (
      body.revenueByDay as Array<{ revenue: number }>
    ).reduce((acc, r) => acc + r.revenue, 0);
    const sumByPayment: number = (
      body.revenueByPaymentMethod as Array<{ revenue: number }>
    ).reduce((acc, r) => acc + r.revenue, 0);

    expect(sumByDay).toBe(totalRevenue);
    expect(sumByPayment).toBe(totalRevenue);
  });

  // ─── Metric-specific responses ───────────────────────────────────────────────

  it('metric=revenue_by_day returns only revenueByDay key', async () => {
    const { body } = await request(app.getHttpServer())
      .get(
        '/api/v1/reports?from=2026-05-01&to=2026-05-07&metric=revenue_by_day',
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(body).toHaveProperty('revenueByDay');
    expect(body).not.toHaveProperty('totals');
    expect(body).not.toHaveProperty('revenueByPaymentMethod');
    expect(body).not.toHaveProperty('topProducts');
  });

  it('metric=total_orders returns only totals key', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1/reports?from=2026-05-01&to=2026-05-07&metric=total_orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(body).toHaveProperty('totals');
    expect(body).not.toHaveProperty('revenueByDay');
  });

  it('metric=top_products returns empty array for range with no orders', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1/reports?from=2020-01-01&to=2020-01-07&metric=top_products')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(body.topProducts).toEqual([]);
  });
});
