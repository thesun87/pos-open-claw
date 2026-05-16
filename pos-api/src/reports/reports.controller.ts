import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import type { TenantContext as TenantContextType } from '../common/decorators/tenant-context.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ReportsQueryDto } from './dto/reports-query.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({
    name: 'from',
    required: false,
    example: '2026-04-16',
    description: 'Ngày bắt đầu YYYY-MM-DD (Asia/Ho_Chi_Minh)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    example: '2026-05-15',
    description: 'Ngày kết thúc YYYY-MM-DD (Asia/Ho_Chi_Minh)',
  })
  @ApiQuery({
    name: 'metric',
    required: false,
    example: 'all',
    enum: [
      'revenue_by_day',
      'total_orders',
      'revenue_by_payment_method',
      'top_products',
      'all',
    ],
    description: 'Loại metric báo cáo',
  })
  @ApiResponse({
    status: 200,
    description: 'Reports metric=all',
    schema: {
      example: {
        revenueByDay: [
          { date: '2026-04-16', revenue: 0, orderCount: 0 },
          { date: '2026-04-17', revenue: 250000, orderCount: 5 },
        ],
        totals: { totalOrders: 132, totalRevenue: 6450000 },
        revenueByPaymentMethod: [
          { paymentMethod: 'cash', revenue: 4200000, orderCount: 88 },
          { paymentMethod: 'transfer', revenue: 1800000, orderCount: 38 },
          { paymentMethod: 'card', revenue: 450000, orderCount: 6 },
        ],
        topProducts: [
          { productName: 'Bạc Xỉu', totalQuantity: 62, totalRevenue: 2170000 },
        ],
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Reports metric=revenue_by_day',
    schema: {
      example: {
        revenueByDay: [
          { date: '2026-04-16', revenue: 0, orderCount: 0 },
          { date: '2026-04-17', revenue: 250000, orderCount: 5 },
        ],
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Reports metric=total_orders',
    schema: {
      example: {
        totals: { totalOrders: 132, totalRevenue: 6450000 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Reports metric=revenue_by_payment_method',
    schema: {
      example: {
        revenueByPaymentMethod: [
          { paymentMethod: 'cash', revenue: 4200000, orderCount: 88 },
          { paymentMethod: 'transfer', revenue: 1800000, orderCount: 38 },
          { paymentMethod: 'card', revenue: 450000, orderCount: 6 },
        ],
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Reports metric=top_products',
    schema: {
      example: {
        topProducts: [
          { productName: 'Bạc Xỉu', totalQuantity: 62, totalRevenue: 2170000 },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation Problem Details',
    schema: {
      examples: {
        'range-too-large': {
          value: {
            type: 'https://pos.example/errors/validation',
            title: 'Bad Request',
            status: 400,
            detail: 'Tối đa 90 ngày một lần',
            instance: '/api/v1/reports',
            traceId: '01HZX9...',
          },
        },
        'from-greater-than-to': {
          value: {
            type: 'https://pos.example/errors/validation',
            title: 'Bad Request',
            status: 400,
            detail: 'from phải nhỏ hơn hoặc bằng to',
            instance: '/api/v1/reports',
            traceId: '01HZX9...',
          },
        },
        'bad-date-format': {
          value: {
            type: 'https://pos.example/errors/validation',
            title: 'Bad Request',
            status: 400,
            detail: 'from phải đúng định dạng YYYY-MM-DD',
            instance: '/api/v1/reports',
            traceId: '01HZX9...',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — missing or invalid Bearer token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — cashier role or missing tenant context',
  })
  async getReports(
    @TenantContext() context: TenantContextType | undefined,
    @Query() query: ReportsQueryDto,
  ) {
    if (!context?.tenantId || !context.storeId) {
      throw new ForbiddenException('Missing tenant context');
    }
    return this.reportsService.getReports(context, query);
  }
}
