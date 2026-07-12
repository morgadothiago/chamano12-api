import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'motorista@exemplo.com' })
  @IsEmail()
  email!: string;
}
