import { IsString, IsNumber, IsOptional, IsIn, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRideDto {
  @ApiProperty({ description: 'Nome do passageiro' })
  @IsString()
  passengerName!: string;

  @ApiProperty({ description: 'Telefone do passageiro', required: false })
  @IsString()
  @IsOptional()
  passengerPhone?: string;

  @ApiProperty({ description: 'Endereço de origem' })
  @IsString()
  origem!: string;

  @ApiProperty({ example: -23.5505 })
  @IsNumber()
  @Min(-90)
  origemLat!: number;

  @ApiProperty({ example: -46.6333 })
  @IsNumber()
  @Min(-180)
  origemLng!: number;

  @ApiProperty({ description: 'Endereço de destino' })
  @IsString()
  destino!: string;

  @ApiProperty({ example: -23.5610 })
  @IsNumber()
  @Min(-90)
  destinoLat!: number;

  @ApiProperty({ example: -46.6560 })
  @IsNumber()
  @Min(-180)
  destinoLng!: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  distanciaKm?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  valor?: number;

  @ApiProperty({ enum: ['dinheiro', 'cartao', 'pix'], required: false })
  @IsIn(['dinheiro', 'cartao', 'pix'])
  @IsOptional()
  formaPagamento?: 'dinheiro' | 'cartao' | 'pix';
}
