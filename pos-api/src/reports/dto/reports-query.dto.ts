import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export type ReportMetric =
  | 'revenue_by_day'
  | 'total_orders'
  | 'revenue_by_payment_method'
  | 'top_products'
  | 'all';

const VALID_METRICS: ReportMetric[] = [
  'revenue_by_day',
  'total_orders',
  'revenue_by_payment_method',
  'top_products',
  'all',
];

export class ReportsQueryDto {
  @ApiProperty({
    name: 'from',
    required: false,
    example: '2026-04-16',
    description: 'Ngày bắt đầu (YYYY-MM-DD, múi giờ Asia/Ho_Chi_Minh)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'from phải đúng định dạng YYYY-MM-DD',
  })
  from?: string;

  @ApiProperty({
    name: 'to',
    required: false,
    example: '2026-05-15',
    description: 'Ngày kết thúc (YYYY-MM-DD, múi giờ Asia/Ho_Chi_Minh)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'to phải đúng định dạng YYYY-MM-DD',
  })
  to?: string;

  @ApiProperty({
    name: 'metric',
    required: false,
    example: 'all',
    description:
      'Loại metric: revenue_by_day | total_orders | revenue_by_payment_method | top_products | all',
    enum: VALID_METRICS,
  })
  @IsOptional()
  @IsIn(VALID_METRICS, {
    message:
      'metric phải là một trong: revenue_by_day, total_orders, revenue_by_payment_method, top_products, all',
  })
  metric?: ReportMetric;
}
