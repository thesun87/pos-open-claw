import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VoidOrderDto {
  @ApiProperty({
    example: 'Khách yêu cầu hủy sau khi thanh toán',
    minLength: 3,
    maxLength: 500,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export const voidOrderExample = {
  reason: 'Khách yêu cầu hủy sau khi thanh toán',
};
