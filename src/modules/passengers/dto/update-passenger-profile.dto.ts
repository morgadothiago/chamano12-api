import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class UpdatePassengerProfileDto {
  @ApiProperty({ example: '01310100', description: 'CEP (8 dígitos)' })
  @IsString()
  @Matches(/^\d{8}$/, { message: 'CEP deve ter 8 dígitos.' })
  cep!: string;

  @ApiProperty({ example: 'Av. Paulista' })
  @IsString()
  @IsNotEmpty()
  logradouro!: string;

  @ApiProperty({ example: '1000' })
  @IsString()
  @IsNotEmpty()
  numero!: string;

  @ApiPropertyOptional({ example: 'Apto 42' })
  @IsOptional()
  @IsString()
  complemento?: string;

  @ApiProperty({ example: 'Bela Vista' })
  @IsString()
  @IsNotEmpty()
  bairro!: string;

  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  @IsNotEmpty()
  cidade!: string;

  @ApiProperty({ example: 'SP' })
  @IsString()
  @Matches(/^[A-Za-z]{2}$/, { message: 'UF inválida.' })
  uf!: string;
}
