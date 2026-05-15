import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

export class OptionInputDto {
  @ApiPropertyOptional({ example: '018f0000-0000-7000-8000-000000000101' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'Size L', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label!: string;

  @ApiProperty({
    example: 5000,
    description: 'Integer VND delta; may be negative, zero, or positive.',
  })
  @IsInt()
  priceDeltaVnd!: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ example: 10, minimum: 0 })
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

@ValidatorConstraint({ name: 'optionGroupRules', async: false })
export class OptionGroupRulesConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const dto = args.object as CreateOptionGroupDto;
    if (dto.minSelect > dto.maxSelect) return false;
    if (dto.isRequired === true && dto.minSelect < 1) return false;
    if (
      dto.maxSelect === 1 &&
      (dto.options ?? []).filter((o) => o.isDefault === true).length > 1
    )
      return false;
    return true;
  }
  defaultMessage(args: ValidationArguments): string {
    const dto = args.object as CreateOptionGroupDto;
    if (dto.minSelect > dto.maxSelect)
      return 'minSelect must be less than or equal to maxSelect';
    if (dto.isRequired === true && dto.minSelect < 1)
      return 'minSelect must be at least 1 when isRequired is true';
    return 'single-select option group can have at most one default option';
  }
}

export class CreateOptionGroupDto {
  @ApiProperty({ example: 'Size', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isRequired!: boolean;

  @ApiProperty({ example: 1, minimum: 0 })
  @IsInt()
  @Min(0)
  minSelect!: number;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  maxSelect!: number;

  @ApiProperty({ example: 10, minimum: 0 })
  @IsInt()
  @Min(0)
  sortOrder!: number;

  @ApiProperty({ type: [OptionInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OptionInputDto)
  options!: OptionInputDto[];

  @Validate(OptionGroupRulesConstraint)
  private readonly optionGroupRules?: true;
}
