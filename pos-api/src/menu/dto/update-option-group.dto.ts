import { PartialType } from '@nestjs/swagger';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  CreateOptionGroupDto,
  OptionInputDto,
} from './create-option-group.dto';

export class UpdateOptionGroupDto extends PartialType(CreateOptionGroupDto) {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionInputDto)
  options?: OptionInputDto[];
}
