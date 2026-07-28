import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { AppException } from '../../shared/filters/app-exception';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ListPassengersQueryDto } from './dto/list-passengers-query.dto';
import { ListTripsQueryDto } from './dto/list-trips-query.dto';
import { PassengerMeResponseDto } from './dto/passenger-me-response.dto';
import { PassengerResponseDto } from './dto/passenger-response.dto';
import { TripResponseDto } from './dto/trip-response.dto';
import { UpdatePassengerAdminDto } from './dto/update-passenger-admin.dto';
import { UpdatePassengerProfileDto } from './dto/update-passenger-profile.dto';
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

  @Get('me')
  @ApiOperation({ summary: 'Retorna o perfil do passageiro autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil encontrado', type: PassengerMeResponseDto })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido' })
  findMe(@CurrentUser() user: JwtPayload) {
    return this.passengersService.findMe(user.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualiza o endereço do passageiro autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil atualizado', type: PassengerMeResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdatePassengerProfileDto) {
    return this.passengersService.updateMe(user.sub, dto);
  }

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Troca a foto de perfil do passageiro autenticado (multipart/form-data)' })
  @ApiResponse({ status: 200, description: 'Avatar atualizado', type: PassengerMeResponseDto })
  @ApiResponse({ status: 400, description: 'Arquivo ausente' })
  uploadAvatar(@CurrentUser() user: JwtPayload, @UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new AppException(
        'FILE_REQUIRED',
        'Nenhum arquivo enviado (campo "file" no multipart/form-data).',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.passengersService.updateAvatar(user.sub, file);
  }

  @Get('me/trips')
  @ApiOperation({ summary: 'Histórico de corridas finalizadas do passageiro autenticado (paginado)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de corridas', type: [TripResponseDto] })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido' })
  listMyTrips(@CurrentUser() user: JwtPayload, @Query() query: ListTripsQueryDto) {
    return this.passengersService.listTrips(user.sub, {
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

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Edita dados de um passageiro (admin)' })
  @ApiParam({ name: 'id', description: 'UUID do passageiro' })
  @ApiResponse({ status: 200, description: 'Passageiro atualizado', type: PassengerResponseDto })
  @ApiResponse({ status: 404, description: 'Passageiro não encontrado' })
  update(@Param('id') id: string, @Body() dto: UpdatePassengerAdminDto) {
    return this.passengersService.update(id, dto);
  }

  @Post(':id/block')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bloqueia o passageiro (impede login)' })
  @ApiParam({ name: 'id', description: 'UUID do passageiro' })
  @ApiResponse({ status: 200, description: 'Passageiro bloqueado', type: PassengerResponseDto })
  @ApiResponse({ status: 404, description: 'Passageiro não encontrado' })
  block(@Param('id') id: string) {
    return this.passengersService.block(id);
  }

  @Post(':id/unblock')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desbloqueia o passageiro' })
  @ApiParam({ name: 'id', description: 'UUID do passageiro' })
  @ApiResponse({ status: 200, description: 'Passageiro desbloqueado', type: PassengerResponseDto })
  @ApiResponse({ status: 404, description: 'Passageiro não encontrado' })
  unblock(@Param('id') id: string) {
    return this.passengersService.unblock(id);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Exclui o passageiro (soft delete — preserva o registro)' })
  @ApiParam({ name: 'id', description: 'UUID do passageiro' })
  @ApiResponse({ status: 200, description: 'Passageiro excluído', type: PassengerResponseDto })
  @ApiResponse({ status: 404, description: 'Passageiro não encontrado' })
  remove(@Param('id') id: string) {
    return this.passengersService.remove(id);
  }
}
