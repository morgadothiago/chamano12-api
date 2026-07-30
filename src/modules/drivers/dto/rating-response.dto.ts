import { ApiProperty } from '@nestjs/swagger';

export class RatingResponseDto {
  @ApiProperty({ example: 'ride-1' })
  id!: string;

  @ApiProperty({ example: 5, description: 'Nota de 1 a 5' })
  avaliacao!: number;

  @ApiProperty({ example: ['Bom condutor', 'Direção segura'], description: 'Tags de avaliação' })
  avaliacaoTags!: string[];

  @ApiProperty({ example: 'Rua A, 100' })
  origem!: string;

  @ApiProperty({ example: 'Rua B, 200' })
  destino!: string;

  @ApiProperty({ example: 25.5 })
  valor!: number;

  @ApiProperty({ example: '2026-07-01T12:00:00.000Z', nullable: true })
  finalizadaEm!: string | null;

  @ApiProperty({ example: 'Carlos Silva' })
  passengerName!: string;
}
