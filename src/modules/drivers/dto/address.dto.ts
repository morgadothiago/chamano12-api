import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddressDto {
  @ApiProperty({ example: '01310100', description: 'CEP do endereço' })
  @IsString()
  @IsNotEmpty()
  cep!: string;

  @ApiProperty({ example: 'Av. Paulista', description: 'Logradouro' })
  @IsString()
  @IsNotEmpty()
  logradouro!: string;

  @ApiProperty({ example: '1000', description: 'Número' })
  @IsString()
  @IsNotEmpty()
  numero!: string;

  @ApiPropertyOptional({ example: 'Apto 42', description: 'Complemento' })
  @IsString()
  @IsOptional()
  complemento?: string;

  @ApiProperty({ example: 'Bela Vista', description: 'Bairro' })
  @IsString()
  @IsNotEmpty()
  bairro!: string;

  @ApiProperty({ example: 'São Paulo', description: 'Cidade' })
  @IsString()
  @IsNotEmpty()
  cidade!: string;

  @ApiProperty({ example: 'SP', description: 'UF (2 letras)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2)
  uf!: string;
}
