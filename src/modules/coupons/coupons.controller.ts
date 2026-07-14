import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CouponResponseDto } from './dto/coupon-response.dto';

@ApiTags('coupons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista todos os cupons' })
  @ApiResponse({ status: 200, type: [CouponResponseDto] })
  findAll() {
    return this.couponsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Cria um cupom novo' })
  @ApiResponse({ status: 201, type: CouponResponseDto })
  @ApiResponse({ status: 409, description: 'Código já existe' })
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita ou ativa/desativa um cupom' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: CouponResponseDto })
  @ApiResponse({ status: 404, description: 'Cupom não encontrado' })
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(id, dto);
  }
}
