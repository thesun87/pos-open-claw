import { PartialType } from '@nestjs/swagger';
import { IsArray, IsOptional, IsUUID, ArrayUnique } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  optionGroupIds?: string[];
}
