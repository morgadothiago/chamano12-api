import { ApiProperty } from '@nestjs/swagger';

export class PricingResponseDto {
  @ApiProperty({ example: 5.0 })
  taxaBase!: number;

  @ApiProperty({ example: 2.5 })
  valorPorKm!: number;

  @ApiProperty({ example: 0.5 })
  valorPorMinuto!: number;

  @ApiProperty({ example: 10.0 })
  valorMinimo!: number;

  @ApiProperty()
  updatedAt!: string;
}
