import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com', description: 'Email do usuário admin' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'admin123', description: 'Senha em texto plano' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
