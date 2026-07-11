import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class VehicleDto {
  @ApiProperty({ example: 'ABC1D23', description: 'Placa do veículo' })
  @IsString()
  @IsNotEmpty()
  placa!: string;

  @ApiProperty({ example: 'Chevrolet Onix', description: 'Modelo do veículo' })
  @IsString()
  @IsNotEmpty()
  modelo!: string;

  @ApiProperty({ example: 2022, description: 'Ano do veículo', minimum: 1990, maximum: 2100 })
  @IsInt()
  @Min(1990)
  @Max(2100)
  ano!: number;
}
