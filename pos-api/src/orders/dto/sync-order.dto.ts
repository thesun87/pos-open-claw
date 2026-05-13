import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export const syncOrderExample = {
  clientOrderId: '018f0000-0000-7000-8000-000000009001',
  orderCode: '20260513-POS01-0001',
  deviceId: 'POS01',
  soldAt: '2026-05-13T07:23:11.000Z',
  menuVersionAtSale: 12,
  items: [
    {
      productId: '018f0000-0000-7000-8000-000000000201',
      productNameSnapshot: 'Bạc Xỉu',
      unitPriceSnapshot: 35000,
      quantity: 1,
      options: [
        {
          optionId: '018f0000-0000-7000-8000-000000000403',
          labelSnapshot: 'Size L',
          priceDeltaSnapshot: 5000,
        },
      ],
      note: 'ít đường',
      lineTotal: 40000,
    },
  ],
  discountAmount: 0,
  total: 40000,
  paymentMethod: 'cash',
} as const;

export class SyncOrderOptionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  optionId!: string;

  @ApiProperty({ example: 'Size L' })
  @IsString()
  @IsNotEmpty()
  labelSnapshot!: string;

  @ApiProperty({ example: 5000 })
  @IsInt()
  priceDeltaSnapshot!: number;
}

export class SyncOrderItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 'Bạc Xỉu' })
  @IsString()
  @IsNotEmpty()
  productNameSnapshot!: string;

  @ApiProperty({ example: 35000 })
  @IsInt()
  @Min(0)
  unitPriceSnapshot!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ type: [SyncOrderOptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncOrderOptionDto)
  options!: SyncOrderOptionDto[];

  @ApiPropertyOptional({ example: 'ít đường' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ example: 40000 })
  @IsInt()
  @Min(0)
  lineTotal!: number;
}

export class SyncOrderDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clientOrderId!: string;

  @ApiProperty({ example: '20260513-POS01-0001' })
  @IsString()
  orderCode!: string;

  @ApiProperty({ example: 'POS01' })
  @IsString()
  deviceId!: string;

  @ApiProperty({ example: '2026-05-13T07:23:11.000Z' })
  @IsISO8601()
  soldAt!: string;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  menuVersionAtSale!: number;

  @ApiProperty({ type: [SyncOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SyncOrderItemDto)
  items!: SyncOrderItemDto[];

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  discountAmount!: number;

  @ApiProperty({ example: 40000 })
  @IsInt()
  @Min(0)
  total!: number;

  @ApiProperty({ enum: ['cash', 'transfer', 'card'] })
  @IsIn(['cash', 'transfer', 'card'])
  paymentMethod!: 'cash' | 'transfer' | 'card';
}
