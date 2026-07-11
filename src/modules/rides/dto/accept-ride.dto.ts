import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptRideDto {
  @ApiProperty({ description: 'ID do motorista que vai aceitar' })
  @IsString()
  driverId!: string;
}
