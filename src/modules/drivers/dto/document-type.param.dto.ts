import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

/**
 * Usado apenas para gerar o enum no Swagger do :tipo path param — a
 * validação real do param acontece no controller (ver drivers.controller.ts).
 */
export class DocumentTypeParamDto {
  @ApiProperty({ enum: ['cnh', 'crlv', 'foto_veiculo'] })
  @IsIn(['cnh', 'crlv', 'foto_veiculo'])
  tipo!: 'cnh' | 'crlv' | 'foto_veiculo';
}
