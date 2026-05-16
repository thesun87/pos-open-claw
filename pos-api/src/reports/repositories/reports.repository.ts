import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantContext } from '../../common/decorators/tenant-context.decorator';
import { PrismaService } from '../../prisma/prisma.service';

// SECURITY NOTE: raw SQL is used here because $queryRaw bypasses Prisma $extends tenant scope.
// Every query MUST explicitly filter by tenant_id and store_id from TenantContext.
// NEVER use $queryRawUnsafe — always use Prisma.sql tagged template for parameter binding.

interface RevenueByDayRow {
  local_date: Date | string;
  revenue: bigint;
  order_count: bigint;
}

interface TotalOrdersRow {
  total_orders: bigint;
  total_revenue: bigint;
}

interface RevenueByPaymentMethodRow {
  payment_method: string;
  revenue: bigint;
  order_count: bigint;
}

interface TopProductRow {
  product_name: string;
  total_quantity: bigint;
  total_revenue: bigint;
}

export interface RevenueByDayResult {
  date: string;
  revenue: number;
  orderCount: number;
}

export interface TotalOrdersResult {
  totalOrders: number;
  totalRevenue: number;
}

export interface RevenueByPaymentMethodResult {
  paymentMethod: string;
  revenue: number;
  orderCount: number;
}

export interface TopProductResult {
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Revenue by day grouped by DATE(sold_at AT TIME ZONE 'Asia/Ho_Chi_Minh').
   * Void exclusion: LEFT JOIN order_voids ov ON ov.order_id = orders.id WHERE ov.id IS NULL
   * EXPLAIN ANALYZE confirmed: uses idx_orders_sold_at for range scan + idx_orders_tenant_store for tenant filter.
   */
  async getRevenueByDay(
    context: TenantContext,
    startUtc: Date,
    endUtcExclusive: Date,
  ): Promise<RevenueByDayResult[]> {
    const rows = await this.prisma.$queryRaw<RevenueByDayRow[]>(
      Prisma.sql`
        SELECT
          DATE(orders.sold_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS local_date,
          COALESCE(SUM(orders.total), 0)::bigint AS revenue,
          COUNT(orders.id)::bigint AS order_count
        FROM orders
        LEFT JOIN order_voids ov ON ov.order_id = orders.id
        WHERE
          ov.id IS NULL
          AND orders.tenant_id = ${context.tenantId}::uuid
          AND orders.store_id = ${context.storeId}::uuid
          AND orders.sold_at >= ${startUtc}
          AND orders.sold_at < ${endUtcExclusive}
        GROUP BY DATE(orders.sold_at AT TIME ZONE 'Asia/Ho_Chi_Minh')
        ORDER BY DATE(orders.sold_at AT TIME ZONE 'Asia/Ho_Chi_Minh') ASC
      `,
    );

    return rows.map((row) => ({
      date:
        row.local_date instanceof Date
          ? row.local_date.toISOString().substring(0, 10)
          : String(row.local_date),
      revenue: Number(row.revenue),
      orderCount: Number(row.order_count),
    }));
  }

  /**
   * Total orders and revenue for the range.
   * Void exclusion: LEFT JOIN order_voids ov ON ov.order_id = orders.id WHERE ov.id IS NULL
   * EXPLAIN ANALYZE confirmed: uses idx_orders_sold_at for sold_at range scan + idx_orders_tenant_store for tenant filter. No sequential scan on orders.
   */
  async getTotalOrders(
    context: TenantContext,
    startUtc: Date,
    endUtcExclusive: Date,
  ): Promise<TotalOrdersResult> {
    const rows = await this.prisma.$queryRaw<TotalOrdersRow[]>(
      Prisma.sql`
        SELECT
          COUNT(orders.id)::bigint AS total_orders,
          COALESCE(SUM(orders.total), 0)::bigint AS total_revenue
        FROM orders
        LEFT JOIN order_voids ov ON ov.order_id = orders.id
        WHERE
          ov.id IS NULL
          AND orders.tenant_id = ${context.tenantId}::uuid
          AND orders.store_id = ${context.storeId}::uuid
          AND orders.sold_at >= ${startUtc}
          AND orders.sold_at < ${endUtcExclusive}
      `,
    );
    const row = rows[0];
    return {
      totalOrders: Number(row?.total_orders ?? 0),
      totalRevenue: Number(row?.total_revenue ?? 0),
    };
  }

  /**
   * Revenue by payment method.
   * Void exclusion: LEFT JOIN order_voids ov ON ov.order_id = orders.id WHERE ov.id IS NULL
   * EXPLAIN ANALYZE confirmed: uses idx_orders_payment_method_sold_at composite index for payment_method + sold_at range scan. No sequential scan on orders.
   */
  async getRevenueByPaymentMethod(
    context: TenantContext,
    startUtc: Date,
    endUtcExclusive: Date,
  ): Promise<RevenueByPaymentMethodResult[]> {
    const rows = await this.prisma.$queryRaw<RevenueByPaymentMethodRow[]>(
      Prisma.sql`
        SELECT
          orders.payment_method,
          COALESCE(SUM(orders.total), 0)::bigint AS revenue,
          COUNT(orders.id)::bigint AS order_count
        FROM orders
        LEFT JOIN order_voids ov ON ov.order_id = orders.id
        WHERE
          ov.id IS NULL
          AND orders.tenant_id = ${context.tenantId}::uuid
          AND orders.store_id = ${context.storeId}::uuid
          AND orders.sold_at >= ${startUtc}
          AND orders.sold_at < ${endUtcExclusive}
        GROUP BY orders.payment_method
        ORDER BY orders.payment_method ASC
      `,
    );

    return rows.map((row) => ({
      paymentMethod: row.payment_method.toLowerCase(),
      revenue: Number(row.revenue),
      orderCount: Number(row.order_count),
    }));
  }

  /**
   * Top 10 products by totalQuantity DESC, productName ASC.
   * Groups by order_items.product_name_snapshot — does NOT join products table (AR24 snapshot immutability).
   * Void exclusion: LEFT JOIN order_voids ov ON ov.order_id = orders.id WHERE ov.id IS NULL
   * IMPORTANT: This query does NOT join products table. Deleted products still count via snapshot.
   * EXPLAIN ANALYZE confirmed: uses idx_orders_sold_at for range scan + idx_order_items_order_id for join. No sequential scan on orders.
   */
  async getTopProducts(
    context: TenantContext,
    startUtc: Date,
    endUtcExclusive: Date,
  ): Promise<TopProductResult[]> {
    const rows = await this.prisma.$queryRaw<TopProductRow[]>(
      Prisma.sql`
        SELECT
          oi.product_name_snapshot AS product_name,
          SUM(oi.quantity)::bigint AS total_quantity,
          SUM(oi.line_total)::bigint AS total_revenue
        FROM orders
        JOIN order_items oi ON oi.order_id = orders.id
        LEFT JOIN order_voids ov ON ov.order_id = orders.id
        WHERE
          ov.id IS NULL
          AND orders.tenant_id = ${context.tenantId}::uuid
          AND orders.store_id = ${context.storeId}::uuid
          AND orders.sold_at >= ${startUtc}
          AND orders.sold_at < ${endUtcExclusive}
        GROUP BY oi.product_name_snapshot
        ORDER BY total_quantity DESC, product_name ASC
        LIMIT 10
      `,
    );

    return rows.map((row) => ({
      productName: row.product_name,
      totalQuantity: Number(row.total_quantity),
      totalRevenue: Number(row.total_revenue),
    }));
  }
}
