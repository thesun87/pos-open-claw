import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Cà phê sữa', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: '018f0000-0000-7000-8000-000000000010' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ example: 35000, minimum: 0 })
  @IsInt()
  @Min(0)
  priceVnd!: number;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/demo/image/upload/v123/products/bac-xiu.jpg', nullable: true })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  imageUrl?: string | null;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 10, minimum: 0 })
  @IsInt()
  @Min(0)
  sortOrder!: number;

  @ApiPropertyOptional({
    example: ['018f0000-0000-7000-8000-000000000100'],
    default: [],
    description:
      'Assigned option groups. Join sortOrder follows submitted array order.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  optionGroupIds?: string[];
}

export class ListProductsQueryDto {
  @ApiPropertyOptional({ example: '018f0000-0000-7000-8000-000000000010' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'cà phê' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}

export class ToggleProductActiveDto {
  @ApiProperty({
    example: false,
    description:
      'Set explicit active state. Use false to tạm tắt instead of deleting if product may be sold again.',
  })
  @IsBoolean()
  isActive!: boolean;
}
