import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '../../shared/filters/app-exception';
import { PaginatedResult } from '../../shared/interfaces/paginated-result.interface';
import {
  IStorageProvider,
  STORAGE_PROVIDER,
} from '../../shared/storage/storage-provider.interface';
import { DriversRepository } from './drivers.repository';
import { mapDriverRow } from './drivers.mapper';
import {
  DocumentTipo,
  ICreateDriver,
  IDriver,
  IDriverListFilters,
  IDriverTrip,
  IUpdateDriver,
} from './interfaces/driver.interface';

const REQUIRED_DOCUMENT_TIPOS: DocumentTipo[] = ['cnh', 'crlv', 'foto_veiculo'];

@Injectable()
export class DriversService {
  constructor(
    private readonly driversRepository: DriversRepository,
    @Inject(STORAGE_PROVIDER) private readonly storageProvider: IStorageProvider,
  ) {}

  async findAll(filters: IDriverListFilters): Promise<PaginatedResult<IDriver>> {
    const { rows, total } = await this.driversRepository.findMany(filters);

    const items = await Promise.all(
      rows.map(async (row) => {
        const [documentos, metrics] = await Promise.all([
          this.driversRepository.findDocuments(row.id),
          this.driversRepository.getMetrics(row.id),
        ]);
        return mapDriverRow(row, documentos, metrics);
      }),
    );

    return { items, meta: { page: filters.page, total, limit: filters.limit } };
  }

  async findById(id: string): Promise<IDriver> {
    const row = await this.driversRepository.findById(id);
    if (!row) {
      throw this.notFound();
    }

    const [documentos, metrics] = await Promise.all([
      this.driversRepository.findDocuments(id),
      this.driversRepository.getMetrics(id),
    ]);

    return mapDriverRow(row, documentos, metrics);
  }

  async findByUserId(userId: string): Promise<IDriver> {
    const row = await this.driversRepository.findByUserId(userId);
    if (!row) {
      throw this.notFound();
    }

    const [documentos, metrics] = await Promise.all([
      this.driversRepository.findDocuments(row.id),
      this.driversRepository.getMetrics(row.id),
    ]);

    return mapDriverRow(row, documentos, metrics);
  }

  async create(data: ICreateDriver, userId?: string): Promise<IDriver> {
    const existing = await this.driversRepository.findByEmail(data.email);
    if (existing) {
      throw new AppException(
        'DRIVER_EMAIL_ALREADY_EXISTS',
        'Já existe um motorista cadastrado com este email.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const row = await this.driversRepository.create(data, userId);
    const [documentos, metrics] = await Promise.all([
      this.driversRepository.findDocuments(row.id),
      this.driversRepository.getMetrics(row.id),
    ]);
    return mapDriverRow(row, documentos, metrics);
  }

  async update(id: string, data: IUpdateDriver): Promise<IDriver> {
    await this.ensureExists(id);
    const row = await this.driversRepository.update(id, data);
    if (!row) {
      throw this.notFound();
    }

    const [documentos, metrics] = await Promise.all([
      this.driversRepository.findDocuments(id),
      this.driversRepository.getMetrics(id),
    ]);
    return mapDriverRow(row, documentos, metrics);
  }

  /**
   * pendente -> ativo. Só permite se os 3 documentos obrigatórios estiverem
   * "aprovado" — validação que o mock original NÃO tinha (lacuna corrigida
   * aqui por decisão de engenharia, ver docs/business-rules.md).
   */
  async approve(id: string): Promise<IDriver> {
    const driver = await this.findById(id);

    if (driver.status !== 'pendente') {
      throw new AppException(
        'DRIVER_NOT_PENDING',
        'Só é possível aprovar motoristas com status "pendente".',
        HttpStatus.BAD_REQUEST,
      );
    }

    const missingOrNotApproved = REQUIRED_DOCUMENT_TIPOS.filter((tipo) => {
      const doc = driver.documentos.find((d) => d.tipo === tipo);
      return !doc || doc.status !== 'aprovado';
    });

    if (missingOrNotApproved.length > 0) {
      throw new AppException(
        'DOCUMENTS_NOT_APPROVED',
        `Documentos pendentes de aprovação: ${missingOrNotApproved.join(', ')}.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return this.setStatus(id, 'ativo');
  }

  /**
   * Soft delete: pendente/ativo/inativo -> rejeitado. Preserva o registro
   * para auditoria (decisão de produto já confirmada — ver
   * docs/business-rules.md, diverge intencionalmente do mock que fazia hard
   * delete).
   */
  async reject(id: string, _motivo?: string): Promise<IDriver> {
    await this.ensureExists(id);
    // `motivo` é aceito no body por contrato de API mas não há coluna
    // dedicada de "motivo de rejeição de cadastro" no schema desta fase —
    // reutilizamos motivoRejeicao a nível de documento quando aplicável.
    // Ver docs/business-rules.md para a decisão de não expandir o schema
    // além do necessário nesta fase.
    return this.setStatus(id, 'rejeitado');
  }

  async activate(id: string): Promise<IDriver> {
    const driver = await this.findById(id);
    if (driver.status === 'rejeitado' || driver.status === 'pendente') {
      throw new AppException(
        'INVALID_STATUS_TRANSITION',
        `Não é possível ativar um motorista com status "${driver.status}".`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.setStatus(id, 'ativo');
  }

  async deactivate(id: string): Promise<IDriver> {
    const driver = await this.findById(id);
    if (driver.status === 'rejeitado' || driver.status === 'pendente') {
      throw new AppException(
        'INVALID_STATUS_TRANSITION',
        `Não é possível inativar um motorista com status "${driver.status}".`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.setStatus(id, 'inativo');
  }

  async uploadDocument(
    id: string,
    tipo: DocumentTipo,
    file: { buffer: Buffer; originalname: string; mimetype: string },
  ): Promise<IDriver> {
    await this.ensureExists(id);

    const stored = await this.storageProvider.save({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      folder: `drivers/${id}`,
    });

    await this.driversRepository.upsertDocumentUpload(id, tipo, stored.url);
    return this.findById(id);
  }

  async reviewDocument(
    id: string,
    tipo: DocumentTipo,
    status: 'aprovado' | 'rejeitado',
    revisadoPor: string,
    motivo?: string,
  ): Promise<IDriver> {
    await this.ensureExists(id);
    const existing = await this.driversRepository.findDocument(id, tipo);
    if (!existing) {
      throw new AppException(
        'DOCUMENT_NOT_FOUND',
        `Documento do tipo "${tipo}" não encontrado para este motorista.`,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.driversRepository.reviewDocument(id, tipo, status, revisadoPor, motivo);
    return this.findById(id);
  }

  async listTrips(
    id: string,
    params: { page: number; limit: number; from?: string; to?: string },
  ): Promise<PaginatedResult<IDriverTrip>> {
    await this.ensureExists(id);
    const { rows, total } = await this.driversRepository.findTrips(id, params);

    const items: IDriverTrip[] = rows.map((row) => ({
      id: row.id,
      data: row.solicitadaEm.toISOString(),
      origem: row.origem,
      destino: row.destino,
      valor: Number(row.valor),
      avaliacao: row.avaliacao ?? 0,
    }));

    return { items, meta: { page: params.page, total, limit: params.limit } };
  }

  private async setStatus(id: string, status: IDriver['status']): Promise<IDriver> {
    const row = await this.driversRepository.updateStatus(id, status);
    if (!row) {
      throw this.notFound();
    }
    const [documentos, metrics] = await Promise.all([
      this.driversRepository.findDocuments(id),
      this.driversRepository.getMetrics(id),
    ]);
    return mapDriverRow(row, documentos, metrics);
  }

  private async ensureExists(id: string): Promise<void> {
    const row = await this.driversRepository.findById(id);
    if (!row) {
      throw this.notFound();
    }
  }

  private notFound(): AppException {
    return new AppException('DRIVER_NOT_FOUND', 'Motorista não encontrado.', HttpStatus.NOT_FOUND);
  }
}
