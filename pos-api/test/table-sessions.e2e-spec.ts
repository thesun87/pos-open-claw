/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import request from 'supertest';
import { App } from 'supertest/types';
import { v7 as uuidv7 } from 'uuid';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/common/filters/problem-details.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Table Sessions lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tenantId: string;
  let storeId: string;
  let otherTenantId: string;
  let otherStoreId: string;
  let cashierId: string;
  let tableId: string;
  let areaId: string;
  let cashierToken: string;
  let otherCashierToken: string;
  let seq = 9000;

  async function makeToken(
    userId: string,
    role: string,
    t = tenantId,
    s = storeId,
  ): Promise<string> {
    return app.get(JwtService).signAsync(
      {
        sub: userId,
        email: `${userId}@sessions.test`,
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

    // Seed tenant, stores, area, table
    tenantId = uuidv7();
    storeId = uuidv7();
    otherTenantId = uuidv7();
    otherStoreId = uuidv7();
    cashierId = uuidv7();
    seq++;

    await prisma.tenant.create({
      data: { id: tenantId, name: `Tenant-E2E-${seq}` },
    });
    await prisma.store.create({
      data: {
        id: storeId,
        tenantId,
        name: `Store-E2E-${seq}`,
        code: `SE2E${seq}`,
        tableMode: true,
      },
    });
    await prisma.tenant.create({
      data: { id: otherTenantId, name: `OtherTenant-${seq}` },
    });
    await prisma.store.create({
      data: {
        id: otherStoreId,
        tenantId: otherTenantId,
        name: `OtherStore-${seq}`,
        code: `OS${seq}`,
        tableMode: true,
      },
    });

    areaId = uuidv7();
    await prisma.area.create({
      data: { id: areaId, tenantId, storeId, name: `Area-${seq}` },
    });
    tableId = uuidv7();
    await prisma.table.create({
      data: { id: tableId, tenantId, storeId, areaId, name: `Table-${seq}` },
    });

    await prisma.user.create({
      data: {
        id: cashierId,
        tenantId,
        storeId,
        email: `cashier${seq}@e2e.test`,
        passwordHash: 'x',
        role: 'Cashier',
      },
    });

    cashierToken = await makeToken(cashierId, 'cashier');

    const otherCashierId = uuidv7();
    await prisma.user.create({
      data: {
        id: otherCashierId,
        tenantId: otherTenantId,
        storeId: otherStoreId,
        email: `cashier${seq}@other.test`,
        passwordHash: 'x',
        role: 'Cashier',
      },
    });
    otherCashierToken = await makeToken(
      otherCashierId,
      'cashier',
      otherTenantId,
      otherStoreId,
    );
  }, 60_000);

  afterAll(async () => {
    await prisma.tableSession.deleteMany({ where: { tenantId } });
    await prisma.tableSession.deleteMany({
      where: { tenantId: otherTenantId },
    });
    await prisma.table.deleteMany({ where: { tenantId } });
    await prisma.area.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.store.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await prisma.user.deleteMany({ where: { tenantId: otherTenantId } });
    await prisma.store.deleteMany({ where: { tenantId: otherTenantId } });
    await prisma.tenant.deleteMany({ where: { id: otherTenantId } });
    await app.close();
  });

  describe('Open session → status shows occupied', () => {
    it('opens a session and /tables/status shows occupied + openSessionCount=1', async () => {
      const clientSessionId = uuidv7();
      const openRes = await request(app.getHttpServer())
        .post(`/api/v1/tables/${tableId}/sessions`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ clientSessionId, deviceId: 'device-e2e-001' });

      expect(openRes.status).toBe(201);
      expect(openRes.body.status).toBe('open');
      expect(openRes.body.tableId).toBe(tableId);
      expect(openRes.body.clientSessionId).toBe(clientSessionId);
      expect(openRes.body.idempotent_replay).toBe(false);

      const statusRes = await request(app.getHttpServer())
        .get('/api/v1/tables/status')
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(statusRes.status).toBe(200);
      const tableStatus = statusRes.body.find(
        (t: { tableId: string }) => t.tableId === tableId,
      );
      expect(tableStatus).toBeDefined();
      expect(tableStatus.status).toBe('occupied');
      expect(tableStatus.openSessionCount).toBe(1);
      expect(tableStatus.conflict).toBe(false);

      // Cleanup
      await prisma.tableSession.deleteMany({ where: { clientSessionId } });
    });
  });

  describe('Two open sessions on same table → conflict=true', () => {
    it('opens 2 sessions for same table → conflict=true, both sessions preserved', async () => {
      const clientSessionId1 = uuidv7();
      const clientSessionId2 = uuidv7();

      await request(app.getHttpServer())
        .post(`/api/v1/tables/${tableId}/sessions`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ clientSessionId: clientSessionId1, deviceId: 'device-001' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/tables/${tableId}/sessions`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ clientSessionId: clientSessionId2, deviceId: 'device-002' })
        .expect(201);

      const statusRes = await request(app.getHttpServer())
        .get('/api/v1/tables/status')
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);

      const tableStatus = statusRes.body.find(
        (t: { tableId: string }) => t.tableId === tableId,
      );
      expect(tableStatus.openSessionCount).toBeGreaterThanOrEqual(2);
      expect(tableStatus.conflict).toBe(true);
      expect(tableStatus.status).toBe('occupied');

      // Both sessions should still exist (no auto-resolve)
      const sessions = await prisma.tableSession.findMany({
        where: {
          tenantId,
          storeId,
          tableId,
          status: 'open',
          clientSessionId: { in: [clientSessionId1, clientSessionId2] },
        },
      });
      expect(sessions).toHaveLength(2);

      // Cleanup
      await prisma.tableSession.deleteMany({
        where: {
          clientSessionId: { in: [clientSessionId1, clientSessionId2] },
        },
      });
    });
  });

  describe('Settle session → status reflects', () => {
    it('settles a session and returns settled status', async () => {
      const clientSessionId = uuidv7();
      const openRes = await request(app.getHttpServer())
        .post(`/api/v1/tables/${tableId}/sessions`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ clientSessionId, deviceId: 'device-001' })
        .expect(201);

      const sessionId: string = openRes.body.id;

      const settleRes = await request(app.getHttpServer())
        .post(`/api/v1/tables/sessions/${sessionId}/settle`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);

      expect(settleRes.body.status).toBe('settled');

      // Idempotent settle — call again
      await request(app.getHttpServer())
        .post(`/api/v1/tables/sessions/${sessionId}/settle`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);
    });
  });

  describe('Idempotent replay — same clientSessionId not duplicated', () => {
    it('replays same clientSessionId and returns idempotent_replay=true', async () => {
      const clientSessionId = uuidv7();

      const first = await request(app.getHttpServer())
        .post(`/api/v1/tables/${tableId}/sessions`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ clientSessionId, deviceId: 'device-001' })
        .expect(201);

      const second = await request(app.getHttpServer())
        .post(`/api/v1/tables/${tableId}/sessions`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ clientSessionId, deviceId: 'device-002' })
        .expect(200);

      expect(second.body.id).toBe(first.body.id);
      expect(second.body.idempotent_replay).toBe(true);

      // Verify only 1 session in DB
      const count = await prisma.tableSession.count({
        where: { tenantId, storeId, clientSessionId },
      });
      expect(count).toBe(1);

      // Cleanup
      await prisma.tableSession.deleteMany({ where: { clientSessionId } });
    });
  });

  describe('GET /tables/sessions', () => {
    it('lists open sessions scoped to store', async () => {
      const clientSessionId = uuidv7();
      await request(app.getHttpServer())
        .post(`/api/v1/tables/${tableId}/sessions`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ clientSessionId, deviceId: 'device-001' })
        .expect(201);

      const listRes = await request(app.getHttpServer())
        .get('/api/v1/tables/sessions?status=open')
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);

      expect(Array.isArray(listRes.body)).toBe(true);
      const found = listRes.body.find(
        (s: { clientSessionId: string }) =>
          s.clientSessionId === clientSessionId,
      );
      expect(found).toBeDefined();
      expect(found.status).toBe('open');

      // Cleanup
      await prisma.tableSession.deleteMany({ where: { clientSessionId } });
    });
  });

  describe('Cross-tenant isolation', () => {
    it('cross-tenant cashier cannot see or settle sessions from other store', async () => {
      const clientSessionId = uuidv7();
      const openRes = await request(app.getHttpServer())
        .post(`/api/v1/tables/${tableId}/sessions`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ clientSessionId, deviceId: 'device-001' })
        .expect(201);

      const sessionId: string = openRes.body.id;

      // Other tenant cashier cannot see this session's table
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/tables/sessions')
        .set('Authorization', `Bearer ${otherCashierToken}`)
        .expect(200);

      const found = listRes.body.find(
        (s: { id: string }) => s.id === sessionId,
      );
      expect(found).toBeUndefined();

      // Other tenant cashier cannot settle this session
      await request(app.getHttpServer())
        .post(`/api/v1/tables/sessions/${sessionId}/settle`)
        .set('Authorization', `Bearer ${otherCashierToken}`)
        .expect(404);

      // Cleanup
      await prisma.tableSession.deleteMany({ where: { clientSessionId } });
    });
  });

  describe('Validation errors', () => {
    it('returns 400 with RFC 7807 body when table does not belong to store', async () => {
      const foreignTableId = uuidv7();
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tables/${foreignTableId}/sessions`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ clientSessionId: uuidv7(), deviceId: 'device-001' });

      expect(res.status).toBe(400);
      expect(res.body.type).toBe('https://pos.example/errors/validation');
      expect(res.body.detail).toContain('Table không thuộc store');
      expect(res.headers['content-type']).toContain('application/problem+json');
    });

    it('returns 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tables/${tableId}/sessions`)
        .send({ clientSessionId: uuidv7(), deviceId: 'device-001' })
        .expect(401);
    });

    it('returns 404 for non-existent session settle', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tables/sessions/${uuidv7()}/settle`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(404);
    });
  });
});
