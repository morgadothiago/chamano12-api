import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class UpdatePricingDto {
  @ApiProperty({ example: 5.0, description: 'Taxa base cobrada em toda corrida' })
  @IsNumber()
  @Min(0)
  taxaBase!: number;

  @ApiProperty({ example: 2.5, description: 'Valor cobrado por km rodado' })
  @IsNumber()
  @Min(0)
  valorPorKm!: number;

  @ApiProperty({ example: 0.5, description: 'Valor cobrado por minuto de viagem' })
  @IsNumber()
  @Min(0)
  valorPorMinuto!: number;

  @ApiProperty({ example: 10.0, description: 'Valor mínimo da corrida, mesmo que o cálculo dê menos' })
  @IsNumber()
  @Min(0)
  valorMinimo!: number;
}
