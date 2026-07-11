import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDriverDto {
  @ApiProperty({ example: 'João da Silva', description: 'Nome completo do motorista' })
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @ApiProperty({ example: 'joao@email.com', description: 'Email do motorista' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', description: 'Senha (mínimo 6 caracteres)' })
  @IsString()
  @MinLength(6)
  password!: string;
}
