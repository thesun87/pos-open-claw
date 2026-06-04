import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class ListSessionsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter sessions by status (defaults to open)',
    example: 'open',
    enum: ['open', 'settled', 'voided', 'superseded'],
  })
  @IsOptional()
  @IsIn(['open', 'settled', 'voided', 'superseded'])
  status?: string;
}
