import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { PricingService } from './pricing.service';
import { PricingResponseDto } from './dto/pricing-response.dto';
import { UpdatePricingDto } from './dto/update-pricing.dto';

@ApiTags('pricing')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get()
  @ApiOperation({
    summary: 'Tarifa padrão vigente — sem autenticação (lido pelos apps de motorista e passageiro)',
  })
  @ApiResponse({ status: 200, type: PricingResponseDto })
  async get(): Promise<PricingResponseDto> {
    return this.pricingService.get();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza a tarifa padrão — admin' })
  @ApiResponse({ status: 200, type: PricingResponseDto })
  async update(@Body() dto: UpdatePricingDto): Promise<PricingResponseDto> {
    return this.pricingService.update(dto);
  }
}
