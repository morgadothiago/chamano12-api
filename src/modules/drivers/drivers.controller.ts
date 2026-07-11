import {
  Body,
  Controller,
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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../shared/decorators/roles.decorator';
import { AppException } from '../../shared/filters/app-exception';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { ListDriversQueryDto } from './dto/list-drivers-query.dto';
import { ListTripsQueryDto } from './dto/list-trips-query.dto';
import { RejectDriverDto } from './dto/reject-driver.dto';
import { ReviewDocumentDto } from './dto/review-document.dto';
import { DriverResponseDto } from './dto/driver-response.dto';
import { TripResponseDto } from './dto/trip-response.dto';
import { DocumentTipo } from './interfaces/driver.interface';

const VALID_DOCUMENT_TIPOS: DocumentTipo[] = ['cnh', 'crlv', 'foto_veiculo'];

function assertValidTipo(tipo: string): asserts tipo is DocumentTipo {
  if (!VALID_DOCUMENT_TIPOS.includes(tipo as DocumentTipo)) {
    throw new AppException(
      'INVALID_DOCUMENT_TIPO',
      `Tipo de documento inválido: "${tipo}". Valores aceitos: ${VALID_DOCUMENT_TIPOS.join(', ')}.`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

@ApiTags('drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Lista motoristas (busca, filtro por status, paginação)' })
  @ApiResponse({ status: 200, description: 'Lista paginada', type: [DriverResponseDto] })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido' })
  findAll(@Query() query: ListDriversQueryDto) {
    return this.driversService.findAll({
      search: query.search,
      status: query.status,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  @Get('me')
  @ApiOperation({ summary: 'Retorna perfil do motorista autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil encontrado', type: DriverResponseDto })
  @ApiResponse({ status: 404, description: 'Perfil não encontrado' })
  findMe(@CurrentUser() user: JwtPayload) {
    return this.driversService.findByUserId(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retorna motorista por ID' })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  @ApiResponse({ status: 200, description: 'Motorista encontrado', type: DriverResponseDto })
  @ApiResponse({ status: 404, description: 'Motorista não encontrado' })
  findOne(@Param('id') id: string) {
    return this.driversService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cria motorista (nasce sempre pendente)' })
  @ApiResponse({ status: 201, description: 'Motorista criado', type: DriverResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  create(@Body() dto: CreateDriverDto, @CurrentUser() user?: JwtPayload) {
    return this.driversService.create(dto, user?.sub);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Atualiza dados cadastrais do motorista (não permite alterar status/metrics/documentos/corridas/localizacaoAtual)',
  })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  @ApiResponse({ status: 200, description: 'Motorista atualizado', type: DriverResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou campos não permitidos no body' })
  @ApiResponse({ status: 404, description: 'Motorista não encontrado' })
  update(@Param('id') id: string, @Body() dto: UpdateDriverDto) {
    return this.driversService.update(id, dto);
  }

  @Post(':id/approve')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aprova motorista pendente (pendente -> ativo)' })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  @ApiResponse({ status: 200, description: 'Motorista aprovado', type: DriverResponseDto })
  @ApiResponse({ status: 400, description: 'Motorista não está pendente' })
  @ApiResponse({ status: 404, description: 'Motorista não encontrado' })
  @ApiResponse({
    status: 422,
    description: 'Documentos obrigatórios ainda não aprovados (DOCUMENTS_NOT_APPROVED)',
  })
  approve(@Param('id') id: string) {
    return this.driversService.approve(id);
  }

  @Post(':id/reject')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rejeita motorista — soft delete, muda status para "rejeitado" (auditável)',
  })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  @ApiResponse({ status: 200, description: 'Motorista rejeitado', type: DriverResponseDto })
  @ApiResponse({ status: 404, description: 'Motorista não encontrado' })
  reject(@Param('id') id: string, @Body() dto: RejectDriverDto) {
    return this.driversService.reject(id, dto.motivo);
  }

  @Post(':id/activate')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ativa motorista (inativo -> ativo)' })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  @ApiResponse({ status: 200, description: 'Motorista ativado', type: DriverResponseDto })
  @ApiResponse({ status: 400, description: 'Transição de status inválida' })
  @ApiResponse({ status: 404, description: 'Motorista não encontrado' })
  activate(@Param('id') id: string) {
    return this.driversService.activate(id);
  }

  @Post(':id/deactivate')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inativa motorista (ativo -> inativo)' })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  @ApiResponse({ status: 200, description: 'Motorista inativado', type: DriverResponseDto })
  @ApiResponse({ status: 400, description: 'Transição de status inválida' })
  @ApiResponse({ status: 404, description: 'Motorista não encontrado' })
  deactivate(@Param('id') id: string) {
    return this.driversService.deactivate(id);
  }

  @Post(':id/documents/:tipo/upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiOperation({ summary: 'Upload de documento do motorista (multipart/form-data)' })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  @ApiParam({ name: 'tipo', enum: ['cnh', 'crlv', 'foto_veiculo'] })
  @ApiResponse({ status: 200, description: 'Documento enviado', type: DriverResponseDto })
  @ApiResponse({ status: 400, description: 'Arquivo ausente ou tipo inválido' })
  @ApiResponse({ status: 404, description: 'Motorista não encontrado' })
  uploadDocument(
    @Param('id') id: string,
    @Param('tipo') tipo: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    assertValidTipo(tipo);
    if (!file) {
      throw new AppException(
        'FILE_REQUIRED',
        'Nenhum arquivo enviado (campo "file" no multipart/form-data).',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.driversService.uploadDocument(id, tipo, file);
  }

  @Patch(':id/documents/:tipo')
  @Roles('admin')
  @ApiOperation({ summary: 'Revisão manual de documento (aprova ou rejeita)' })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  @ApiParam({ name: 'tipo', enum: ['cnh', 'crlv', 'foto_veiculo'] })
  @ApiResponse({ status: 200, description: 'Documento revisado', type: DriverResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Motorista ou documento não encontrado' })
  reviewDocument(
    @Param('id') id: string,
    @Param('tipo') tipo: string,
    @Body() dto: ReviewDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    assertValidTipo(tipo);
    return this.driversService.reviewDocument(id, tipo, dto.status, user.sub, dto.motivo);
  }

  @Get(':id/trips')
  @ApiOperation({ summary: 'Histórico de corridas do motorista (paginado)' })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  @ApiResponse({ status: 200, description: 'Lista paginada de corridas', type: [TripResponseDto] })
  @ApiResponse({ status: 404, description: 'Motorista não encontrado' })
  listTrips(@Param('id') id: string, @Query() query: ListTripsQueryDto) {
    return this.driversService.listTrips(id, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      from: query.from,
      to: query.to,
    });
  }
}
