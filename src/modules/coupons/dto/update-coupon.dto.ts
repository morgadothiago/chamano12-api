import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateCouponDto {
  @ApiPropertyOptional({ enum: ['percentual', 'fixo'] })
  @IsOptional()
  @IsIn(['percentual', 'fixo'])
  tipoDesconto?: 'percentual' | 'fixo';

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valor?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
