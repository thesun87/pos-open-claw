import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateCurrentStoreDto {
  @ApiProperty({ description: 'Bật/tắt chế độ phục vụ bàn' })
  @IsBoolean()
  tableMode!: boolean;
}
