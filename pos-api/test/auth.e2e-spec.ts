/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getStorageToken, ThrottlerStorageService } from '@nestjs/throttler';
import { PinoLogger } from 'nestjs-pino';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/common/filters/problem-details.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { v7 as uuidv7 } from 'uuid';

function cookieValue(setCookie: string[], name: string): string {
  const found = setCookie.find((c) => c.startsWith(`${name}=`));
  if (!found) throw new Error(`missing ${name}`);
  const value = found.split(';')[0]?.split('=')[1];
  if (!value) throw new Error(`empty ${name}`);
  return value;
}

describe('Auth endpoints (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let throttlerStorage: ThrottlerStorageService;
  let e2eTenantId: string;
  let e2eStoreId: string;

  async function createUser(
    email: string,
    role: 'Admin' | 'Cashier',
    isRevoked = false,
    tenantId = e2eTenantId,
    storeId = e2eStoreId,
  ) {
    const [localPart, domain] = email.split('@');
    const uniqueEmail = `${localPart}.${uuidv7()}@${domain}`;

    return prisma.user.create({
      data: {
        id: uuidv7(),
        tenantId,
        storeId,
        email: uniqueEmail,
        passwordHash: await bcrypt.hash(
          role === 'Admin' ? 'Admin@123!' : 'Cashier@123!',
          12,
        ),
        role,
        isRevoked,
      },
    });
  }

  function signAccessToken(
    userId: string,
    role: 'Admin' | 'Cashier',
    tenantId = e2eTenantId,
    storeId = e2eStoreId,
  ): Promise<string> {
    return app.get(JwtService).signAsync(
      {
        sub: userId,
        email: `${userId}@token.local`,
        role,
        tenantId,
        storeId,
      },
      {
        secret: process.env.JWT_SECRET ?? 'change-me-in-local-env',
        expiresIn: '7d',
      },
    );
  }

  async function expectUserRevoked(
    userId: string,
    expected: boolean,
  ): Promise<void> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.isRevoked).toBe(expected);
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
    throttlerStorage = app.get<ThrottlerStorageService>(getStorageToken());
    const tenantId = uuidv7();
    const storeId = uuidv7();
    e2eTenantId = tenantId;
    e2eStoreId = storeId;
    await prisma.tenant.upsert({
      where: { id: tenantId },
      update: {},
      create: { id: tenantId, name: 'E2E Cafe' },
    });
    await prisma.store.upsert({
      where: { tenantId_code: { tenantId, code: 'E2E' } },
      update: {},
      create: { id: storeId, tenantId, code: 'E2E', name: 'E2E Store' },
    });
    await prisma.user.upsert({
      where: {
        tenantId_storeId_email: {
          tenantId,
          storeId,
          email: 'cashier.e2e@cafe.demo',
        },
      },
      update: {
        passwordHash: await bcrypt.hash('Cashier@123!', 12),
        role: 'Cashier',
        isRevoked: false,
      },
      create: {
        id: uuidv7(),
        tenantId,
        storeId,
        email: 'cashier.e2e@cafe.demo',
        passwordHash: await bcrypt.hash('Cashier@123!', 12),
        role: 'Cashier',
      },
    });
  });

  beforeEach(() => {
    throttlerStorage.storage.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('login -> refresh -> logout happy path with rotation', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'cashier.e2e@cafe.demo', password: 'Cashier@123!' })
      .expect(200);
    expect(login.body.user.email).toBe('cashier.e2e@cafe.demo');
    const decoded = app.get(JwtService).decode(login.body.accessToken);
    expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60);
    const setCookie = login.headers['set-cookie'] as unknown as string[];
    expect(setCookie.join('\n')).toContain('HttpOnly');
    expect(setCookie.join('\n')).toContain('SameSite=Lax');
    const refreshCookie = cookieValue(setCookie, 'refresh_token');
    const csrf = login.headers['x-csrf-token'] as string;
    const before = await prisma.refreshToken.count({
      where: { revokedAt: null },
    });

    const refresh = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [`refresh_token=${refreshCookie}`, `csrf_token=${csrf}`])
      .set('X-CSRF-Token', csrf)
      .expect(200);
    expect(refresh.body.accessToken).toBeDefined();
    expect(
      await prisma.refreshToken.count({ where: { revokedAt: null } }),
    ).toBe(before);
    expect(
      await prisma.refreshToken.count({ where: { revokedAt: { not: null } } }),
    ).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${refresh.body.accessToken}`)
      .set('Cookie', refresh.headers['set-cookie'] as unknown as string[])
      .expect(204);
  });

  it('returns problem details for validation, invalid credentials, and csrf fail', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'bad', password: '' })
      .expect('Content-Type', /application\/problem\+json/)
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'missing@cafe.demo', password: 'x' })
      .expect(401)
      .expect(({ body }) =>
        expect(body.type).toBe(
          'https://pos.example/errors/invalid-credentials',
        ),
      );
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', ['refresh_token=x', 'csrf_token=a'])
      .set('X-CSRF-Token', 'b')
      .expect(403)
      .expect(({ body }) =>
        expect(body.type).toBe('https://pos.example/errors/csrf-failed'),
      );
  });

  it('returns session-revoked for a revoked matching refresh token', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'cashier.e2e@cafe.demo', password: 'Cashier@123!' })
      .expect(200);
    const setCookie = login.headers['set-cookie'] as unknown as string[];
    const refreshCookie = cookieValue(setCookie, 'refresh_token');
    const csrf = login.headers['x-csrf-token'] as string;
    const tokens = await prisma.refreshToken.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    for (const token of tokens) {
      if (await bcrypt.compare(refreshCookie, token.tokenHash)) {
        await prisma.refreshToken.update({
          where: { id: token.id },
          data: { revokedAt: new Date() },
        });
        break;
      }
    }

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [`refresh_token=${refreshCookie}`, `csrf_token=${csrf}`])
      .set('X-CSRF-Token', csrf)
      .expect('Content-Type', /application\/problem\+json/)
      .expect(401)
      .expect(({ body }) =>
        expect(body.type).toBe('https://pos.example/errors/session-revoked'),
      );
  });

  it('allows admin to revoke a user session and returns 204 without body', async () => {
    const admin = await createUser(
      'admin.revoke.e2e@cafe.demo',
      'Admin',
      false,
      e2eTenantId,
      e2eStoreId,
    );
    const cashier = await createUser(
      'target.revoke.e2e@cafe.demo',
      'Cashier',
      false,
      e2eTenantId,
      e2eStoreId,
    );
    await prisma.refreshToken.create({
      data: {
        id: uuidv7(),
        userId: cashier.id,
        tokenHash: await bcrypt.hash('active-refresh-token', 12),
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    const adminToken = await signAccessToken(
      admin.id,
      'Admin',
      e2eTenantId,
      e2eStoreId,
    );

    const response = await request(app.getHttpServer())
      .post(`/api/v1/auth/sessions/${cashier.id}/revoke`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    expect(response.text).toBe('');
    await expectUserRevoked(cashier.id, true);
    expect(
      await prisma.refreshToken.count({
        where: { userId: cashier.id, revokedAt: { not: null } },
      }),
    ).toBe(1);
  });

  it('returns 403 problem details when cashier calls revoke', async () => {
    const cashier = await createUser(
      'cashier.revoke.e2e@cafe.demo',
      'Cashier',
      false,
      e2eTenantId,
      e2eStoreId,
    );
    const target = await createUser(
      'target.cashier-revoke.e2e@cafe.demo',
      'Cashier',
      false,
      e2eTenantId,
      e2eStoreId,
    );
    const cashierToken = await signAccessToken(
      cashier.id,
      'Cashier',
      e2eTenantId,
      e2eStoreId,
    );

    await request(app.getHttpServer())
      .post(`/api/v1/auth/sessions/${target.id}/revoke`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect('Content-Type', /application\/problem\+json/)
      .expect(403)
      .expect(({ body }) =>
        expect(body.type).toBe('https://pos.example/errors/forbidden'),
      );
    await expectUserRevoked(target.id, false);
  });

  it('returns 401 problem details for anonymous or invalid bearer revoke', async () => {
    for (const authorization of [undefined, 'Bearer invalid-token']) {
      const agent = request(app.getHttpServer()).post(
        `/api/v1/auth/sessions/${uuidv7()}/revoke`,
      );
      if (authorization) agent.set('Authorization', authorization);
      await agent
        .expect('Content-Type', /application\/problem\+json/)
        .expect(401)
        .expect(({ body }) =>
          expect(body.type).toBe('https://pos.example/errors/unauthorized'),
        );
    }
  });

  it('returns 404 for missing or cross-tenant target without leaking existence', async () => {
    const admin = await createUser(
      'admin.not-found.e2e@cafe.demo',
      'Admin',
      false,
      e2eTenantId,
      e2eStoreId,
    );
    const otherTenantId = uuidv7();
    const otherStoreId = uuidv7();
    await prisma.tenant.create({
      data: { id: otherTenantId, name: 'Other E2E Cafe' },
    });
    await prisma.store.create({
      data: {
        id: otherStoreId,
        tenantId: otherTenantId,
        code: 'OTHER',
        name: 'Other Store',
      },
    });
    const otherUser = await createUser(
      'other.tenant.e2e@cafe.demo',
      'Cashier',
      false,
      otherTenantId,
      otherStoreId,
    );
    const adminToken = await signAccessToken(
      admin.id,
      'Admin',
      e2eTenantId,
      e2eStoreId,
    );

    for (const targetId of [uuidv7(), otherUser.id]) {
      await request(app.getHttpServer())
        .post(`/api/v1/auth/sessions/${targetId}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /application\/problem\+json/)
        .expect(404)
        .expect(({ body }) =>
          expect(body.type).toBe('https://pos.example/errors/not-found'),
        );
    }
    await expectUserRevoked(otherUser.id, false);
  });

  it('is idempotent when target was already revoked', async () => {
    const admin = await createUser(
      'admin.idempotent.e2e@cafe.demo',
      'Admin',
      false,
      e2eTenantId,
      e2eStoreId,
    );
    const target = await createUser(
      'target.idempotent.e2e@cafe.demo',
      'Cashier',
      true,
      e2eTenantId,
      e2eStoreId,
    );
    const adminToken = await signAccessToken(
      admin.id,
      'Admin',
      e2eTenantId,
      e2eStoreId,
    );

    await request(app.getHttpServer())
      .post(`/api/v1/auth/sessions/${target.id}/revoke`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
    await expectUserRevoked(target.id, true);
  });

  it('returns session-revoked and clears cookies when revoked target refreshes', async () => {
    const admin = await createUser(
      'admin.refresh-revoke.e2e@cafe.demo',
      'Admin',
      false,
      e2eTenantId,
      e2eStoreId,
    );
    const target = await createUser(
      'target.refresh-revoke.e2e@cafe.demo',
      'Cashier',
      false,
      e2eTenantId,
      e2eStoreId,
    );
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: target.email, password: 'Cashier@123!' })
      .expect(200);
    const setCookie = login.headers['set-cookie'] as unknown as string[];
    const refreshCookie = cookieValue(setCookie, 'refresh_token');
    const csrf = login.headers['x-csrf-token'] as string;
    const adminToken = await signAccessToken(
      admin.id,
      'Admin',
      e2eTenantId,
      e2eStoreId,
    );

    await request(app.getHttpServer())
      .post(`/api/v1/auth/sessions/${target.id}/revoke`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [`refresh_token=${refreshCookie}`, `csrf_token=${csrf}`])
      .set('X-CSRF-Token', csrf)
      .expect('Content-Type', /application\/problem\+json/)
      .expect('Set-Cookie', /refresh_token=;/)
      .expect('Set-Cookie', /csrf_token=;/)
      .expect(401)
      .expect(({ body }) =>
        expect(body.type).toBe('https://pos.example/errors/session-revoked'),
      );
  });

  it('rate limits login and refresh with 429 problem details on the sixth attempt per minute', async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', '203.0.113.10')
        .set('X-Test-Rate-Limit', 'login')
        .send({ email: 'missing@cafe.demo', password: 'wrong' });
    }
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '203.0.113.10')
      .set('X-Test-Rate-Limit', 'login')
      .send({ email: 'missing@cafe.demo', password: 'wrong' })
      .expect('Content-Type', /application\/problem\+json/)
      .expect(429);

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('X-Forwarded-For', '203.0.113.20')
        .set('X-Test-Rate-Limit', 'refresh')
        .set('Cookie', ['refresh_token=x', 'csrf_token=a'])
        .set('X-CSRF-Token', 'b');
    }
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('X-Forwarded-For', '203.0.113.20')
      .set('X-Test-Rate-Limit', 'refresh')
      .set('Cookie', ['refresh_token=x', 'csrf_token=a'])
      .set('X-CSRF-Token', 'b')
      .expect('Content-Type', /application\/problem\+json/)
      .expect(429);
  });
});
