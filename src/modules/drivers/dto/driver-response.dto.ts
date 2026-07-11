import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleDto } from './vehicle.dto';

export class AddressDto {
  @ApiProperty({ example: '01310100' })
  cep!: string;

  @ApiProperty({ example: 'Av. Paulista' })
  logradouro!: string;

  @ApiProperty({ example: '1000' })
  numero!: string;

  @ApiPropertyOptional({ example: 'Apto 42' })
  complemento?: string;

  @ApiProperty({ example: 'Bela Vista' })
  bairro!: string;

  @ApiProperty({ example: 'São Paulo' })
  cidade!: string;

  @ApiProperty({ example: 'SP' })
  uf!: string;
}

export class DriverMetricsDto {
  @ApiProperty({ example: 128 })
  corridas!: number;

  @ApiProperty({ example: 4.8 })
  avaliacaoMedia!: number;

  @ApiProperty({ example: 3540.5 })
  ganhos!: number;
}

export class LatLngDto {
  @ApiProperty({ example: -23.55052 })
  lat!: number;

  @ApiProperty({ example: -46.633308 })
  lng!: number;
}

export class DriverDocumentDto {
  @ApiProperty({ enum: ['cnh', 'crlv', 'foto_veiculo'], example: 'cnh' })
  tipo!: 'cnh' | 'crlv' | 'foto_veiculo';

  @ApiProperty({ enum: ['aprovado', 'pendente', 'rejeitado'], example: 'pendente' })
  status!: 'aprovado' | 'pendente' | 'rejeitado';

  @ApiProperty({ example: '2026-07-01T12:00:00.000Z' })
  enviadoEm!: string;

  @ApiProperty({ example: '/uploads/drivers/abc/cnh.png', nullable: true })
  arquivoUrl!: string | null;

  @ApiPropertyOptional({ example: 'user-1' })
  revisadoPor?: string;

  @ApiPropertyOptional({ example: 'Foto ilegível' })
  motivoRejeicao?: string;
}

export class DriverResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  id!: string;

  @ApiProperty({ example: 'João da Silva' })
  nome!: string;

  @ApiProperty({ example: 'joao@example.com' })
  email!: string;

  @ApiProperty({ example: '11999998888' })
  telefone!: string;

  @ApiProperty({ example: '12345678900' })
  cnh!: string;

  @ApiProperty({ enum: ['ativo', 'inativo', 'pendente', 'rejeitado'], example: 'pendente' })
  status!: 'ativo' | 'inativo' | 'pendente' | 'rejeitado';

  @ApiProperty({ example: null, nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ type: VehicleDto })
  veiculo!: VehicleDto;

  @ApiProperty({ type: AddressDto })
  endereco!: AddressDto;

  @ApiProperty({ type: DriverMetricsDto })
  metrics!: DriverMetricsDto;

  @ApiProperty({ type: [DriverDocumentDto] })
  documentos!: DriverDocumentDto[];

  @ApiProperty({ type: LatLngDto, nullable: true })
  localizacaoAtual!: LatLngDto | null;
}
