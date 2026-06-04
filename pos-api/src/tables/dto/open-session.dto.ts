import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class OpenSessionDto {
  @ApiProperty({
    description: 'Client-generated UUIDv7 for idempotency',
    example: '018f0000-0000-7000-8000-000000000001',
  })
  @IsUUID()
  clientSessionId!: string;

  @ApiProperty({
    description: 'Device identifier that opened the session',
    example: 'device-pos-001',
  })
  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @ApiPropertyOptional({
    description: 'ISO 8601 timestamp when session was opened (defaults to now)',
    example: '2026-06-04T08:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  openedAt?: string;
}
