import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class RegisterPassengerDto {
  @ApiProperty({ example: 'Maria Souza', description: 'Nome completo do passageiro' })
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @ApiProperty({ example: 'maria@email.com', description: 'Email do passageiro' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', description: 'Senha (mínimo 6 caracteres)' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: '11912345678', description: 'Telefone (apenas dígitos, DDD + número)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10,11}$/, { message: 'Telefone deve ter 10 ou 11 dígitos (DDD + número).' })
  phone!: string;
}
