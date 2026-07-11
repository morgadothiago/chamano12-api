import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListDriversQueryDto {
  @ApiPropertyOptional({ example: 'João', description: 'Busca por nome' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['ativo', 'inativo', 'pendente', 'rejeitado'] })
  @IsOptional()
  @IsIn(['ativo', 'inativo', 'pendente', 'rejeitado'])
  status?: 'ativo' | 'inativo' | 'pendente' | 'rejeitado';

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
