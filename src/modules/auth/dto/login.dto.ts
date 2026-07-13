import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com', description: 'Email do usuário admin' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'admin123', description: 'Senha em texto plano' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({
    enum: ['motorista', 'passageiro'],
    required: false,
    description: 'Enviado pelo app motorista para rejeitar contas que não são de motorista.',
  })
  @IsIn(['motorista', 'passageiro'])
  @IsOptional()
  deviceType?: 'motorista' | 'passageiro';
}
