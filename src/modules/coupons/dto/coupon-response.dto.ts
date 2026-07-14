import { ApiProperty } from '@nestjs/swagger';

export class CouponResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'BEMVINDO10' }) codigo!: string;
  @ApiProperty({ enum: ['percentual', 'fixo'] }) tipoDesconto!: 'percentual' | 'fixo';
  @ApiProperty({ example: 10 }) valor!: number;
  @ApiProperty({ example: true }) ativo!: boolean;
  @ApiProperty() createdAt!: string;
}
