import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class ListOrdersQueryDto {
  @ApiPropertyOptional({
    description: 'Match mã đơn hàng',
    example: '20260521-POS01-0001',
  })
  @IsOptional()
  order_code?: string;

  @ApiPropertyOptional({
    description: 'Alias tìm kiếm mã đơn',
    example: 'POS01',
  })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Ngày bắt đầu theo Asia/Ho_Chi_Minh',
    example: '2026-05-01',
  })
  @IsOptional()
  @Matches(DATE_ONLY_REGEX, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc theo Asia/Ho_Chi_Minh',
    example: '2026-05-21',
  })
  @IsOptional()
  @Matches(DATE_ONLY_REGEX, { message: 'to must be YYYY-MM-DD' })
  to?: string;
}
