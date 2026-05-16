import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import { PROBLEM_TYPES } from '../common/errors/problem-types';
import { ReportMetric, ReportsQueryDto } from './dto/reports-query.dto';
import {
  RevenueByDayResult,
  RevenueByPaymentMethodResult,
  TotalOrdersResult,
  TopProductResult,
  ReportsRepository,
} from './repositories/reports.repository';

export interface ReportsResponse {
  revenueByDay?: RevenueByDayResult[];
  totals?: TotalOrdersResult;
  revenueByPaymentMethod?: RevenueByPaymentMethodResult[];
  topProducts?: TopProductResult[];
}

// Vietnam does not observe DST, so parsing YYYY-MM-DD + T00:00:00+07:00 is accurate.
// We use the IANA timezone name in SQL (AT TIME ZONE 'Asia/Ho_Chi_Minh') — not hardcoded offset.
export function buildUtcRange(
  fromYmd: string,
  toYmd: string,
): { startUtc: Date; endUtcExclusive: Date } {
  // Parse as Asia/Ho_Chi_Minh local midnight → UTC
  const startUtc = new Date(`${fromYmd}T00:00:00+07:00`);
  // End is (to + 1 day) midnight in +07:00 → UTC (half-open interval)
  const toDate = new Date(`${toYmd}T00:00:00+07:00`);
  const endUtcExclusive = new Date(toDate.getTime() + 24 * 60 * 60 * 1000);
  return { startUtc, endUtcExclusive };
}

/**
 * Enumerate all dates (YYYY-MM-DD) from fromYmd to toYmd inclusive.
 * Works purely with date strings to avoid timezone offset issues.
 */
export function enumerateDates(fromYmd: string, toYmd: string): string[] {
  const dates: string[] = [];
  // Parse as simple calendar dates using UTC midnight to avoid DST ambiguity
  const currentMs = Date.UTC(
    parseInt(fromYmd.substring(0, 4)),
    parseInt(fromYmd.substring(5, 7)) - 1,
    parseInt(fromYmd.substring(8, 10)),
  );
  const endMs = Date.UTC(
    parseInt(toYmd.substring(0, 4)),
    parseInt(toYmd.substring(5, 7)) - 1,
    parseInt(toYmd.substring(8, 10)),
  );
  let ms = currentMs;
  while (ms <= endMs) {
    const d = new Date(ms);
    const yyyy = d.getUTCFullYear().toString().padStart(4, '0');
    const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const dd = d.getUTCDate().toString().padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    ms += 24 * 60 * 60 * 1000;
  }
  return dates;
}

const ALL_PAYMENT_METHODS = ['cash', 'transfer', 'card'] as const;

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async getReports(
    context: TenantContext | undefined,
    query: ReportsQueryDto,
  ): Promise<ReportsResponse> {
    if (!context?.tenantId || !context.storeId) {
      throw new ForbiddenException('Missing tenant context');
    }

    // Default metric = 'all'
    const metric: ReportMetric = query.metric ?? 'all';

    // Default date range: last 30 days
    const today = new Date();
    const todayYmd = today.toISOString().substring(0, 10);
    const thirtyDaysAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgoYmd = thirtyDaysAgo.toISOString().substring(0, 10);

    const fromYmd = query.from ?? thirtyDaysAgoYmd;
    const toYmd = query.to ?? todayYmd;

    // Validate date range
    this.validateDateRange(fromYmd, toYmd);

    const { startUtc, endUtcExclusive } = buildUtcRange(fromYmd, toYmd);

    const result: ReportsResponse = {};

    if (metric === 'all') {
      const [revenueByDay, totals, revenueByPaymentMethod, topProducts] =
        await Promise.all([
          this.reportsRepository.getRevenueByDay(
            context,
            startUtc,
            endUtcExclusive,
          ),
          this.reportsRepository.getTotalOrders(
            context,
            startUtc,
            endUtcExclusive,
          ),
          this.reportsRepository.getRevenueByPaymentMethod(
            context,
            startUtc,
            endUtcExclusive,
          ),
          this.reportsRepository.getTopProducts(
            context,
            startUtc,
            endUtcExclusive,
          ),
        ]);

      result.revenueByDay = this.fillMissingDates(revenueByDay, fromYmd, toYmd);
      result.totals = totals;
      result.revenueByPaymentMethod = this.fillMissingPaymentMethods(
        revenueByPaymentMethod,
      );
      result.topProducts = topProducts;
    } else if (metric === 'revenue_by_day') {
      const rows = await this.reportsRepository.getRevenueByDay(
        context,
        startUtc,
        endUtcExclusive,
      );
      result.revenueByDay = this.fillMissingDates(rows, fromYmd, toYmd);
    } else if (metric === 'total_orders') {
      result.totals = await this.reportsRepository.getTotalOrders(
        context,
        startUtc,
        endUtcExclusive,
      );
    } else if (metric === 'revenue_by_payment_method') {
      const rows = await this.reportsRepository.getRevenueByPaymentMethod(
        context,
        startUtc,
        endUtcExclusive,
      );
      result.revenueByPaymentMethod = this.fillMissingPaymentMethods(rows);
    } else if (metric === 'top_products') {
      result.topProducts = await this.reportsRepository.getTopProducts(
        context,
        startUtc,
        endUtcExclusive,
      );
    }

    return result;
  }

  private validateDateRange(fromYmd: string, toYmd: string): void {
    const fromDate = new Date(`${fromYmd}T00:00:00+07:00`);
    const toDate = new Date(`${toYmd}T00:00:00+07:00`);

    if (isNaN(fromDate.getTime())) {
      throw new BadRequestException({
        type: PROBLEM_TYPES.validation,
        title: 'Bad Request',
        detail: 'from không hợp lệ — phải đúng định dạng YYYY-MM-DD',
      });
    }

    if (isNaN(toDate.getTime())) {
      throw new BadRequestException({
        type: PROBLEM_TYPES.validation,
        title: 'Bad Request',
        detail: 'to không hợp lệ — phải đúng định dạng YYYY-MM-DD',
      });
    }

    if (fromDate > toDate) {
      throw new BadRequestException({
        type: PROBLEM_TYPES.validation,
        title: 'Bad Request',
        detail: 'from phải nhỏ hơn hoặc bằng to',
      });
    }

    const diffMs = toDate.getTime() - fromDate.getTime();
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000)) + 1;
    if (diffDays > 90) {
      throw new BadRequestException({
        type: PROBLEM_TYPES.validation,
        title: 'Bad Request',
        detail: 'Tối đa 90 ngày một lần',
      });
    }
  }

  private fillMissingDates(
    rows: RevenueByDayResult[],
    fromYmd: string,
    toYmd: string,
  ): RevenueByDayResult[] {
    const rowMap = new Map(rows.map((r) => [r.date, r]));
    const allDates = enumerateDates(fromYmd, toYmd);
    return allDates.map(
      (date) => rowMap.get(date) ?? { date, revenue: 0, orderCount: 0 },
    );
  }

  private fillMissingPaymentMethods(
    rows: RevenueByPaymentMethodResult[],
  ): RevenueByPaymentMethodResult[] {
    const rowMap = new Map(rows.map((r) => [r.paymentMethod, r]));
    return ALL_PAYMENT_METHODS.map(
      (method) =>
        rowMap.get(method) ?? {
          paymentMethod: method,
          revenue: 0,
          orderCount: 0,
        },
    );
  }
}
