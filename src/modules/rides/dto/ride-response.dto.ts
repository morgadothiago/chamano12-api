import { ApiProperty } from '@nestjs/swagger';

export class RideResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() driverId!: string | null;
  @ApiProperty() passengerId!: string | null;
  @ApiProperty() passengerName!: string;
  @ApiProperty() passengerPhone!: string | null;
  @ApiProperty() origem!: string;
  @ApiProperty() origemLat!: number;
  @ApiProperty() origemLng!: number;
  @ApiProperty() destino!: string;
  @ApiProperty() destinoLat!: number;
  @ApiProperty() destinoLng!: number;
  @ApiProperty({ enum: ['solicitada', 'aceita', 'iniciada', 'finalizada', 'cancelada'] })
  status!: string;
  @ApiProperty() valor!: number | null;
  @ApiProperty() distanciaKm!: number | null;
  @ApiProperty() avaliacao!: number | null;
  @ApiProperty() solicitadaEm!: string;
  @ApiProperty() aceitaEm!: string | null;
  @ApiProperty() iniciadaEm!: string | null;
  @ApiProperty() finalizadaEm!: string | null;
  @ApiProperty() canceladaEm!: string | null;
  @ApiProperty({ enum: ['motorista', 'passageiro', 'sistema'] })
  canceladoPor!: string | null;
  @ApiProperty() motivoCancelamento!: string | null;
}
