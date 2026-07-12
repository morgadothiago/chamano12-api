import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { ListPassengersQueryDto } from './dto/list-passengers-query.dto';
import { PassengerResponseDto } from './dto/passenger-response.dto';
import { PassengersService } from './passengers.service';

@ApiTags('passengers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('passengers')
export class PassengersController {
  constructor(private readonly passengersService: PassengersService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Lista passageiros (busca por nome/email, paginação)' })
  @ApiResponse({ status: 200, description: 'Lista paginada', type: [PassengerResponseDto] })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido' })
  findAll(@Query() query: ListPassengersQueryDto) {
    return this.passengersService.findAll({
      search: query.search,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Retorna passageiro por ID' })
  @ApiParam({ name: 'id', description: 'UUID do passageiro' })
  @ApiResponse({ status: 200, description: 'Passageiro encontrado', type: PassengerResponseDto })
  @ApiResponse({ status: 404, description: 'Passageiro não encontrado' })
  findOne(@Param('id') id: string) {
    return this.passengersService.findById(id);
  }
}
