/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PROBLEM_TYPES } from '../common/errors/problem-types';
import { ReportsQueryDto } from './dto/reports-query.dto';
import {
  RevenueByDayResult,
  RevenueByPaymentMethodResult,
  ReportsRepository,
  TopProductResult,
} from './repositories/reports.repository';
import {
  buildUtcRange,
  enumerateDates,
  ReportsService,
} from './reports.service';

describe('buildUtcRange', () => {
  it('converts YYYY-MM-DD in Asia/Ho_Chi_Minh to UTC half-open interval', () => {
    const { startUtc, endUtcExclusive } = buildUtcRange(
      '2026-05-09',
      '2026-05-09',
    );
    // 2026-05-09T00:00:00+07:00 = 2026-05-08T17:00:00Z
    expect(startUtc.toISOString()).toBe('2026-05-08T17:00:00.000Z');
    // 2026-05-10T00:00:00+07:00 = 2026-05-09T17:00:00Z
    expect(endUtcExclusive.toISOString()).toBe('2026-05-09T17:00:00.000Z');
  });

  it('TZ boundary: sold_at 2026-05-09T16:59:59.999Z falls in local 2026-05-09', () => {
    const { startUtc, endUtcExclusive } = buildUtcRange(
      '2026-05-09',
      '2026-05-09',
    );
    const soldAt = new Date('2026-05-09T16:59:59.999Z');
    // Should be within [startUtc, endUtcExclusive)
    // startUtc = 2026-05-08T17:00:00Z, endUtcExclusive = 2026-05-09T17:00:00Z
    expect(soldAt >= startUtc && soldAt < endUtcExclusive).toBe(true);
  });

  it('TZ boundary: sold_at 2026-05-09T17:00:00.000Z falls in local 2026-05-10 (outside 2026-05-09 range)', () => {
    const { startUtc, endUtcExclusive } = buildUtcRange(
      '2026-05-09',
      '2026-05-09',
    );
    const soldAt = new Date('2026-05-09T17:00:00.000Z');
    // endUtcExclusive = 2026-05-09T17:00:00Z — sold_at == endUtcExclusive, so NOT in range
    expect(soldAt >= startUtc && soldAt < endUtcExclusive).toBe(false);
  });

  it('handles multi-day range correctly', () => {
    const { startUtc, endUtcExclusive } = buildUtcRange(
      '2026-04-01',
      '2026-04-30',
    );
    expect(startUtc.toISOString()).toBe('2026-03-31T17:00:00.000Z');
    expect(endUtcExclusive.toISOString()).toBe('2026-04-30T17:00:00.000Z');
  });
});

describe('enumerateDates', () => {
  it('returns single date for same-day range', () => {
    expect(enumerateDates('2026-05-01', '2026-05-01')).toEqual(['2026-05-01']);
  });

  it('returns 7 dates for 7-day range', () => {
    const dates = enumerateDates('2026-05-01', '2026-05-07');
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe('2026-05-01');
    expect(dates[6]).toBe('2026-05-07');
  });

  it('enumerates all dates in range without gaps', () => {
    const dates = enumerateDates('2026-04-29', '2026-05-02');
    expect(dates).toEqual([
      '2026-04-29',
      '2026-04-30',
      '2026-05-01',
      '2026-05-02',
    ]);
  });
});

const mockContext = {
  tenantId: '018f0000-0000-7000-8000-000000000001',
  storeId: '018f0000-0000-7000-8000-000000000002',
  userId: '018f0000-0000-7000-8000-000000000003',
  role: 'admin' as const,
};

const makeRepo = (
  overrides: Partial<ReportsRepository> = {},
): ReportsRepository =>
  ({
    getRevenueByDay: jest.fn().mockResolvedValue([]),
    getTotalOrders: jest
      .fn()
      .mockResolvedValue({ totalOrders: 0, totalRevenue: 0 }),
    getRevenueByPaymentMethod: jest.fn().mockResolvedValue([]),
    getTopProducts: jest.fn().mockResolvedValue([]),
    ...overrides,
  }) as unknown as ReportsRepository;

describe('ReportsService', () => {
  let service: ReportsService;
  let repo: ReportsRepository;

  beforeEach(async () => {
    repo = makeRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: ReportsRepository, useValue: repo },
      ],
    }).compile();
    service = module.get(ReportsService);
  });

  it('throws ForbiddenException when context is missing', async () => {
    await expect(
      service.getReports(undefined, {
        from: '2026-05-01',
        to: '2026-05-01',
        metric: 'all',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws ForbiddenException when tenantId is missing', async () => {
    await expect(
      service.getReports(
        { tenantId: '', storeId: 'x' },
        { from: '2026-05-01', to: '2026-05-01', metric: 'all' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws 400 with Vietnamese message when from > to', async () => {
    const dto: ReportsQueryDto = {
      from: '2026-05-10',
      to: '2026-05-01',
      metric: 'all',
    };
    await expect(service.getReports(mockContext, dto)).rejects.toMatchObject({
      response: expect.objectContaining({
        type: PROBLEM_TYPES.validation,
        detail: 'from phải nhỏ hơn hoặc bằng to',
      }),
    });
  });

  it('throws 400 with Vietnamese message when range exceeds 90 days', async () => {
    const dto: ReportsQueryDto = {
      from: '2026-01-01',
      to: '2026-04-02',
      metric: 'all',
    };
    await expect(service.getReports(mockContext, dto)).rejects.toMatchObject({
      response: expect.objectContaining({
        type: PROBLEM_TYPES.validation,
        detail: 'Tối đa 90 ngày một lần',
      }),
    });
  });

  it('accepts 90-day range without throwing', async () => {
    // 2026-01-01 to 2026-03-31 = 90 days inclusive
    const dto: ReportsQueryDto = {
      from: '2026-01-01',
      to: '2026-03-31',
      metric: 'all',
    };
    await expect(service.getReports(mockContext, dto)).resolves.toBeDefined();
  });

  it('calls Promise.all with 4 methods for metric=all', async () => {
    const dto: ReportsQueryDto = {
      from: '2026-05-01',
      to: '2026-05-07',
      metric: 'all',
    };
    await service.getReports(mockContext, dto);
    expect(repo.getRevenueByDay).toHaveBeenCalledTimes(1);
    expect(repo.getTotalOrders).toHaveBeenCalledTimes(1);
    expect(repo.getRevenueByPaymentMethod).toHaveBeenCalledTimes(1);
    expect(repo.getTopProducts).toHaveBeenCalledTimes(1);
  });

  it('only calls getRevenueByDay for metric=revenue_by_day', async () => {
    const dto: ReportsQueryDto = {
      from: '2026-05-01',
      to: '2026-05-07',
      metric: 'revenue_by_day',
    };
    const result = await service.getReports(mockContext, dto);
    expect(repo.getRevenueByDay).toHaveBeenCalledTimes(1);
    expect(repo.getTotalOrders).not.toHaveBeenCalled();
    expect(result).toHaveProperty('revenueByDay');
    expect(result).not.toHaveProperty('totals');
  });

  it('only calls getTotalOrders for metric=total_orders', async () => {
    const dto: ReportsQueryDto = {
      from: '2026-05-01',
      to: '2026-05-07',
      metric: 'total_orders',
    };
    const result = await service.getReports(mockContext, dto);
    expect(repo.getTotalOrders).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty('totals');
    expect(result).not.toHaveProperty('revenueByDay');
  });

  it('fills 0 for days with no orders in revenueByDay', async () => {
    const mockRows: RevenueByDayResult[] = [
      { date: '2026-05-03', revenue: 50000, orderCount: 2 },
    ];
    (repo.getRevenueByDay as jest.Mock).mockResolvedValue(mockRows);

    const dto: ReportsQueryDto = {
      from: '2026-05-01',
      to: '2026-05-05',
      metric: 'revenue_by_day',
    };
    const result = await service.getReports(mockContext, dto);
    expect(result.revenueByDay).toHaveLength(5);
    expect(result.revenueByDay![0]).toEqual({
      date: '2026-05-01',
      revenue: 0,
      orderCount: 0,
    });
    expect(result.revenueByDay![2]).toEqual({
      date: '2026-05-03',
      revenue: 50000,
      orderCount: 2,
    });
    expect(result.revenueByDay![4]).toEqual({
      date: '2026-05-05',
      revenue: 0,
      orderCount: 0,
    });
  });

  it('same-day range: fills exactly 1 day with correct data', async () => {
    const mockRows: RevenueByDayResult[] = [
      { date: '2026-05-09', revenue: 100000, orderCount: 3 },
    ];
    (repo.getRevenueByDay as jest.Mock).mockResolvedValue(mockRows);

    const dto: ReportsQueryDto = {
      from: '2026-05-09',
      to: '2026-05-09',
      metric: 'revenue_by_day',
    };
    const result = await service.getReports(mockContext, dto);
    expect(result.revenueByDay).toHaveLength(1);
    expect(result.revenueByDay![0]).toEqual({
      date: '2026-05-09',
      revenue: 100000,
      orderCount: 3,
    });
  });

  it('fills all 3 payment methods even when some have 0 orders', async () => {
    const mockRows: RevenueByPaymentMethodResult[] = [
      { paymentMethod: 'cash', revenue: 100000, orderCount: 3 },
    ];
    (repo.getRevenueByPaymentMethod as jest.Mock).mockResolvedValue(mockRows);

    const dto: ReportsQueryDto = {
      from: '2026-05-01',
      to: '2026-05-07',
      metric: 'revenue_by_payment_method',
    };
    const result = await service.getReports(mockContext, dto);
    expect(result.revenueByPaymentMethod).toHaveLength(3);
    expect(
      result.revenueByPaymentMethod!.find(
        (r) => r.paymentMethod === 'transfer',
      ),
    ).toEqual({
      paymentMethod: 'transfer',
      revenue: 0,
      orderCount: 0,
    });
    expect(
      result.revenueByPaymentMethod!.find((r) => r.paymentMethod === 'card'),
    ).toEqual({
      paymentMethod: 'card',
      revenue: 0,
      orderCount: 0,
    });
  });

  it('empty range returns empty totals and empty arrays', async () => {
    const dto: ReportsQueryDto = {
      from: '2026-05-01',
      to: '2026-05-01',
      metric: 'total_orders',
    };
    const result = await service.getReports(mockContext, dto);
    expect(result.totals).toEqual({ totalOrders: 0, totalRevenue: 0 });
  });

  it('returns only topProducts key for metric=top_products', async () => {
    const mockRows: TopProductResult[] = [
      { productName: 'Bạc Xỉu', totalQuantity: 10, totalRevenue: 350000 },
    ];
    (repo.getTopProducts as jest.Mock).mockResolvedValue(mockRows);

    const dto: ReportsQueryDto = {
      from: '2026-05-01',
      to: '2026-05-07',
      metric: 'top_products',
    };
    const result = await service.getReports(mockContext, dto);
    expect(result).toHaveProperty('topProducts');
    expect(result).not.toHaveProperty('revenueByDay');
    expect(result.topProducts?.[0]?.productName).toBe('Bạc Xỉu');
  });

  it('metric=all consistency: response has all 4 keys', async () => {
    const dto: ReportsQueryDto = {
      from: '2026-05-01',
      to: '2026-05-07',
      metric: 'all',
    };
    const result = await service.getReports(mockContext, dto);
    expect(result).toHaveProperty('revenueByDay');
    expect(result).toHaveProperty('totals');
    expect(result).toHaveProperty('revenueByPaymentMethod');
    expect(result).toHaveProperty('topProducts');
  });

  it('uses default metric=all when metric not provided', async () => {
    const dto: ReportsQueryDto = { from: '2026-05-01', to: '2026-05-07' };
    const result = await service.getReports(mockContext, dto);
    expect(result).toHaveProperty('revenueByDay');
    expect(result).toHaveProperty('totals');
    expect(result).toHaveProperty('revenueByPaymentMethod');
    expect(result).toHaveProperty('topProducts');
  });
});

// Snapshot/grep guard: ensure repository never uses $queryRawUnsafe or joins products table in top-products
describe('ReportsRepository source guards', () => {
  const repoSource = fs.readFileSync(
    path.join(__dirname, 'repositories/reports.repository.ts'),
    'utf-8',
  );

  it('does NOT contain $queryRawUnsafe (AR4 security requirement)', () => {
    // Only allowed in comments (e.g. "NEVER use $queryRawUnsafe"); must not appear as actual code call
    const lines = repoSource.split('\n');
    const codeLines = lines.filter(
      (l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'),
    );
    expect(codeLines.join('\n')).not.toContain('$queryRawUnsafe');
  });

  it('top-products query does NOT join the products table (AR24 snapshot immutability)', () => {
    // getTopProducts should only reference order_items for product data, never the products table
    const topProductsMethodStart = repoSource.indexOf('async getTopProducts');
    const topProductsMethodEnd = repoSource.indexOf(
      'async ',
      topProductsMethodStart + 1,
    );
    const topProductsSource =
      topProductsMethodEnd > topProductsMethodStart
        ? repoSource.substring(topProductsMethodStart, topProductsMethodEnd)
        : repoSource.substring(topProductsMethodStart);
    // Should not JOIN products table (only joins order_items and order_voids)
    expect(topProductsSource).not.toMatch(/JOIN\s+products\b/i);
  });
});
