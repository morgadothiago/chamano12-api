import { ApiProperty } from '@nestjs/swagger';

export class TripResponseDto {
  @ApiProperty({ example: 'trip-1' })
  id!: string;

  @ApiProperty({ example: '2026-07-01T12:00:00.000Z' })
  data!: string;

  @ApiProperty({ example: 'Rua A, 100' })
  origem!: string;

  @ApiProperty({ example: 'Rua B, 200' })
  destino!: string;

  @ApiProperty({ example: 25.5 })
  valor!: number;

  @ApiProperty({ example: 5 })
  avaliacao!: number;
}
