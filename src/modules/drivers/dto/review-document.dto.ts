import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewDocumentDto {
  @ApiProperty({ enum: ['aprovado', 'rejeitado'], example: 'aprovado' })
  @IsIn(['aprovado', 'rejeitado'])
  status!: 'aprovado' | 'rejeitado';

  @ApiPropertyOptional({ example: 'Foto fora de foco' })
  @IsOptional()
  @IsString()
  motivo?: string;
}
