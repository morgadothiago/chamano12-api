import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RejectDriverDto {
  @ApiPropertyOptional({ example: 'Documentos ilegíveis', description: 'Motivo da rejeição' })
  @IsOptional()
  @IsString()
  motivo?: string;
}
