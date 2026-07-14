import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { DriverLocationStore } from '../../shared/location/driver-location.store';
import { DriversRepository } from '../drivers/drivers.repository';
import { AppException } from '../../shared/filters/app-exception';
import { RidesService } from './rides.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { ListRidesQueryDto } from './dto/list-rides-query.dto';
import { RideResponseDto } from './dto/ride-response.dto';

@ApiTags('rides')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rides')
export class RidesController {
  constructor(
    private readonly ridesService: RidesService,
    private readonly locationStore: DriverLocationStore,
    private readonly driversRepository: DriversRepository,
  ) {}

  @Get('nearby-drivers')
  @ApiOperation({ summary: 'Retorna motoristas disponíveis próximos a uma localização' })
  @ApiQuery({ name: 'lat', type: Number })
  @ApiQuery({ name: 'lng', type: Number })
  @ApiQuery({ name: 'radius', type: Number, required: false })
  nearbyDrivers(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusNum = radius ? parseFloat(radius) : 5;
    return this.locationStore.findNearby(latNum, lngNum, radiusNum);
  }

  @Post()
  @ApiOperation({ summary: 'Passageiro solicita uma nova corrida' })
  @ApiResponse({ status: 201, description: 'Corrida solicitada', type: RideResponseDto })
  @ApiResponse({ status: 400, description: 'Já existe corrida pendente' })
  async create(@Body() dto: CreateRideDto, @CurrentUser() user: JwtPayload) {
    return this.ridesService.createRideRequest({
      passengerId: user.sub,
      passengerName: dto.passengerName,
      passengerPhone: dto.passengerPhone,
      origem: dto.origem,
      origemLat: dto.origemLat,
      origemLng: dto.origemLng,
      destino: dto.destino,
      destinoLat: dto.destinoLat,
      destinoLng: dto.destinoLng,
      distanciaKm: dto.distanciaKm,
      valor: dto.valor,
    });
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Motorista aceita uma corrida' })
  @ApiParam({ name: 'id', description: 'ID da corrida' })
  @ApiResponse({ status: 200, description: 'Corrida aceita', type: RideResponseDto })
  @ApiResponse({ status: 400, description: 'Corrida não disponível' })
  @ApiResponse({ status: 403, description: 'Usuário autenticado não é um motorista' })
  async accept(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    // O `driverId` NUNCA deve vir do body: `AcceptRideDto.driverId` permitia
    // que qualquer usuário autenticado aceitasse uma corrida em nome de
    // qualquer motorista (IDOR). O id do motorista é sempre resolvido a
    // partir do usuário do JWT, igual ao fluxo equivalente via WebSocket
    // (`driver:accept-ride` em ws-passenger.gateway.ts).
    const driver = await this.driversRepository.findByUserId(user.sub);
    if (!driver) {
      throw new AppException(
        'DRIVER_NOT_FOUND',
        'Usuário autenticado não possui um perfil de motorista.',
        HttpStatus.FORBIDDEN,
      );
    }
    return this.ridesService.acceptRide(id, driver.id);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Motorista inicia a corrida (embarcou passageiro)' })
  @ApiParam({ name: 'id', description: 'ID da corrida' })
  @ApiResponse({ status: 200, description: 'Corrida iniciada', type: RideResponseDto })
  start(@Param('id') id: string) {
    return this.ridesService.startRide(id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Motorista finaliza a corrida' })
  @ApiParam({ name: 'id', description: 'ID da corrida' })
  @ApiResponse({ status: 200, description: 'Corrida finalizada', type: RideResponseDto })
  complete(@Param('id') id: string) {
    return this.ridesService.completeRide(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancela uma corrida (motorista, passageiro ou sistema)' })
  @ApiParam({ name: 'id', description: 'ID da corrida' })
  @ApiResponse({ status: 200, description: 'Corrida cancelada', type: RideResponseDto })
  cancel(
    @Param('id') id: string,
    @Body() body: { canceladoPor: 'motorista' | 'passageiro' | 'sistema'; motivo?: string },
  ) {
    return this.ridesService.cancelRide(id, body.canceladoPor, body.motivo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retorna corrida por ID' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: RideResponseDto })
  @ApiResponse({ status: 404, description: 'Corrida não encontrada' })
  findOne(@Param('id') id: string) {
    return this.ridesService.findById(id);
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Lista corridas (admin) — filtra por status, motorista, passageiro' })
  @ApiResponse({ status: 200, type: [RideResponseDto] })
  findAll(@Query() query: ListRidesQueryDto) {
    return this.ridesService.listRides({
      status: query.status,
      driverId: query.driverId,
      passengerId: query.passengerId,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }
}
