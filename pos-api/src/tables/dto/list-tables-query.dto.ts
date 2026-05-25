import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ListTablesQueryDto {
  @ApiPropertyOptional({ example: '018f0000-0000-7000-8000-0000000000a1' })
  @IsOptional()
  @IsUUID()
  areaId?: string;
}
