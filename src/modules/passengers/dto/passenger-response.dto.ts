import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PassengerTripDto {
  @ApiProperty() id!: string;
  @ApiProperty() data!: string;
  @ApiProperty() origem!: string;
  @ApiProperty() destino!: string;
  @ApiProperty() valor!: number;
  @ApiProperty() motorista!: string;
  @ApiPropertyOptional() avaliacao?: number;
}

export class PassengerResponseDto {
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

  @ApiProperty({ example: 'ativo', enum: ['ativo', 'bloqueado', 'excluido'] })
  status!: string;

  @ApiProperty({ example: 0 })
  saldoDevedor!: number;

  @ApiProperty({ example: 12 })
  totalCorridas!: number;

  @ApiProperty({ example: 345.5 })
  totalGasto!: number;

  @ApiProperty({ example: '2026-07-12T00:00:00.000Z' })
  cadastroEm!: string;

  @ApiPropertyOptional({ example: '2026-07-12T00:00:00.000Z', nullable: true })
  ultimaCorrida!: string | null;

  @ApiProperty({ type: [PassengerTripDto] })
  corridas!: PassengerTripDto[];
}
