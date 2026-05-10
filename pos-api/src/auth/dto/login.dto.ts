import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'cashier@cafe.demo' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Cashier@123!' })
  @IsString()
  @MinLength(1)
  password!: string;
}
