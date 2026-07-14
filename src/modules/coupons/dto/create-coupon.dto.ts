import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsString, Min, MinLength } from 'class-validator';

export class CreateCouponDto {
  @ApiProperty({ example: 'BEMVINDO10' })
  @IsString()
  @MinLength(3)
  codigo!: string;

  @ApiProperty({ enum: ['percentual', 'fixo'], example: 'percentual' })
  @IsIn(['percentual', 'fixo'])
  tipoDesconto!: 'percentual' | 'fixo';

  @ApiProperty({ example: 10, description: 'Percentual (0-100) ou valor fixo em R$, conforme tipoDesconto' })
  @IsNumber()
  @Min(0)
  valor!: number;
}
