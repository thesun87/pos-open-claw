import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class MenuSyncQueryDto {
  @ApiPropertyOptional({
    name: 'since_version',
    example: 3,
    minimum: 0,
    description:
      'Client local menu version. If it matches the server version, response omits snapshot.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
    return value;
  })
  @IsInt()
  @Min(0)
  since_version?: number;

  @ApiPropertyOptional({
    name: 'include_inactive',
    example: false,
    description:
      'Admin-only flag to include inactive menu entities for preview/debug. Cashier requests remain active-only.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  include_inactive?: boolean;
}
