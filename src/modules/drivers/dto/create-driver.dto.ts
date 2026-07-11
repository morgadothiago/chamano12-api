import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { VehicleDto } from './vehicle.dto';
import { AddressDto } from './address.dto';

export class CreateDriverDto {
  @ApiProperty({ example: 'João da Silva', description: 'Nome completo do motorista' })
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @ApiProperty({ example: 'joao@example.com', description: 'Email do motorista' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '11999998888', description: 'Telefone com DDD' })
  @IsString()
  @IsNotEmpty()
  telefone!: string;

  @ApiProperty({ example: '12345678900', description: 'Número da CNH' })
  @IsString()
  @IsNotEmpty()
  cnh!: string;

  @ApiProperty({ type: VehicleDto })
  @ValidateNested()
  @Type(() => VehicleDto)
  veiculo!: VehicleDto;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  endereco!: AddressDto;
}
