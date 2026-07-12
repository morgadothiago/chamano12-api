import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PassengerAddressDto {
  @ApiProperty() cep!: string;
  @ApiProperty() logradouro!: string;
  @ApiProperty() numero!: string;
  @ApiPropertyOptional() complemento?: string | null;
  @ApiProperty() bairro!: string;
  @ApiProperty() cidade!: string;
  @ApiProperty() uf!: string;
}

export class PassengerMeResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  id!: string;

  @ApiProperty({ example: 'Maria Souza' })
  nome!: string;

  @ApiProperty({ example: 'maria@email.com' })
  email!: string;

  @ApiPropertyOptional({ example: '11912345678', nullable: true })
  telefone!: string | null;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl!: string | null;

  @ApiPropertyOptional({ type: PassengerAddressDto, nullable: true })
  endereco!: PassengerAddressDto | null;

  @ApiProperty({ example: false })
  cadastroCompleto!: boolean;
}
