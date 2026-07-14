import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ilike, sql, count, avg, sum } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import { driverDocuments, drivers, rides } from '../../database/schema';
import type { DriverDocumentRow, DriverRow } from '../../database/schema';
import {
  DocumentStatus,
  DocumentTipo,
  DriverStatus,
  ICreateDriver,
  IUpdateDriver,
} from './interfaces/driver.interface';

export interface DriverListParams {
  search?: string;
  status?: DriverStatus;
  page: number;
  limit: number;
}

const DOCUMENT_TIPOS: DocumentTipo[] = ['cnh', 'crlv', 'foto_veiculo'];

@Injectable()
export class DriversRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findMany(params: DriverListParams) {
    const { search, status, page, limit } = params;

    const conditions = [];
    if (search) {
      conditions.push(ilike(drivers.nome, `%${search}%`));
    }
    if (status) {
      conditions.push(eq(drivers.status, status));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(drivers)
        .where(where)
        .orderBy(drivers.createdAt)
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ value: count() }).from(drivers).where(where),
    ]);

    return { rows, total: totalRows[0]?.value ?? 0 };
  }

  async findById(id: string): Promise<DriverRow | null> {
    const rows = await this.db.select().from(drivers).where(eq(drivers.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async findByUserId(userId: string): Promise<DriverRow | null> {
    const rows = await this.db.select().from(drivers).where(eq(drivers.userId, userId)).limit(1);
    return rows[0] ?? null;
  }

  async findByEmail(email: string): Promise<DriverRow | null> {
    const rows = await this.db.select().from(drivers).where(eq(drivers.email, email)).limit(1);
    return rows[0] ?? null;
  }

  async create(data: ICreateDriver, userId?: string) {
    return this.db.transaction(async (tx) => {
      const [driver] = await tx
        .insert(drivers)
        .values({
          userId: userId ?? null,
          nome: data.nome,
          email: data.email,
          telefone: data.telefone,
          cnh: data.cnh,
          veiculoPlaca: data.veiculo.placa,
          veiculoModelo: data.veiculo.modelo,
          veiculoAno: data.veiculo.ano,
          enderecoCep: data.endereco.cep,
          enderecoLogradouro: data.endereco.logradouro,
          enderecoNumero: data.endereco.numero,
          enderecoComplemento: data.endereco.complemento ?? null,
          enderecoBairro: data.endereco.bairro,
          enderecoCidade: data.endereco.cidade,
          enderecoUf: data.endereco.uf,
          status: 'pendente',
        })
        .returning();

      await tx.insert(driverDocuments).values(
        DOCUMENT_TIPOS.map((tipo) => ({
          driverId: driver.id,
          tipo,
          status: 'pendente' as DocumentStatus,
        })),
      );

      return driver;
    });
  }

  async update(id: string, data: IUpdateDriver): Promise<DriverRow | null> {
    const values: Partial<typeof drivers.$inferInsert> = { updatedAt: new Date() };
    if (data.nome !== undefined) values.nome = data.nome;
    if (data.email !== undefined) values.email = data.email;
    if (data.telefone !== undefined) values.telefone = data.telefone;
    if (data.cnh !== undefined) values.cnh = data.cnh;
    if (data.veiculo !== undefined) {
      if (data.veiculo.placa !== undefined) values.veiculoPlaca = data.veiculo.placa;
      if (data.veiculo.modelo !== undefined) values.veiculoModelo = data.veiculo.modelo;
      if (data.veiculo.ano !== undefined) values.veiculoAno = data.veiculo.ano;
    }
    if (data.endereco !== undefined) {
      if (data.endereco.cep !== undefined) values.enderecoCep = data.endereco.cep;
      if (data.endereco.logradouro !== undefined) values.enderecoLogradouro = data.endereco.logradouro;
      if (data.endereco.numero !== undefined) values.enderecoNumero = data.endereco.numero;
      if (data.endereco.complemento !== undefined) values.enderecoComplemento = data.endereco.complemento;
      if (data.endereco.bairro !== undefined) values.enderecoBairro = data.endereco.bairro;
      if (data.endereco.cidade !== undefined) values.enderecoCidade = data.endereco.cidade;
      if (data.endereco.uf !== undefined) values.enderecoUf = data.endereco.uf;
    }

    const [driver] = await this.db
      .update(drivers)
      .set(values)
      .where(eq(drivers.id, id))
      .returning();
    return driver ?? null;
  }

  async updateStatus(id: string, status: DriverStatus): Promise<DriverRow | null> {
    const [driver] = await this.db
      .update(drivers)
      .set({ status, updatedAt: new Date() })
      .where(eq(drivers.id, id))
      .returning();
    return driver ?? null;
  }

  async updateAvatarUrl(id: string, avatarUrl: string): Promise<DriverRow | null> {
    const [driver] = await this.db
      .update(drivers)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(eq(drivers.id, id))
      .returning();
    return driver ?? null;
  }

  async findDocuments(driverId: string): Promise<DriverDocumentRow[]> {
    return this.db.select().from(driverDocuments).where(eq(driverDocuments.driverId, driverId));
  }

  async findDocument(driverId: string, tipo: DocumentTipo): Promise<DriverDocumentRow | null> {
    const rows = await this.db
      .select()
      .from(driverDocuments)
      .where(and(eq(driverDocuments.driverId, driverId), eq(driverDocuments.tipo, tipo)))
      .limit(1);
    return rows[0] ?? null;
  }

  async upsertDocumentUpload(driverId: string, tipo: DocumentTipo, arquivoUrl: string) {
    const existing = await this.findDocument(driverId, tipo);
    if (!existing) {
      const [row] = await this.db
        .insert(driverDocuments)
        .values({ driverId, tipo, status: 'pendente', arquivoUrl })
        .returning();
      return row;
    }

    const [row] = await this.db
      .update(driverDocuments)
      .set({ status: 'pendente', arquivoUrl, updatedAt: new Date() })
      .where(eq(driverDocuments.id, existing.id))
      .returning();
    return row;
  }

  async reviewDocument(
    driverId: string,
    tipo: DocumentTipo,
    status: 'aprovado' | 'rejeitado',
    revisadoPor: string,
    motivoRejeicao?: string,
  ) {
    const [row] = await this.db
      .update(driverDocuments)
      .set({
        status,
        revisadoPor,
        motivoRejeicao: status === 'rejeitado' ? (motivoRejeicao ?? null) : null,
        updatedAt: new Date(),
      })
      .where(and(eq(driverDocuments.driverId, driverId), eq(driverDocuments.tipo, tipo)))
      .returning();
    return row ?? null;
  }

  async getMetrics(driverId: string) {
    const [row] = await this.db
      .select({
        corridas: count(rides.id),
        avaliacaoMedia: avg(rides.avaliacao),
        ganhos: sum(rides.valor),
      })
      .from(rides)
      .where(and(eq(rides.driverId, driverId), eq(rides.status, 'finalizada')));

    return {
      corridas: row?.corridas ?? 0,
      avaliacaoMedia: row?.avaliacaoMedia ? Number(row.avaliacaoMedia) : 0,
      ganhos: row?.ganhos ? Number(row.ganhos) : 0,
    };
  }

  async findTrips(
    driverId: string,
    params: { page: number; limit: number; from?: string; to?: string },
  ) {
    const conditions = [eq(rides.driverId, driverId), eq(rides.status, 'finalizada')];
    if (params.from) {
      conditions.push(sql`${rides.solicitadaEm} >= ${params.from}`);
    }
    if (params.to) {
      conditions.push(sql`${rides.solicitadaEm} <= ${params.to}`);
    }
    const where = and(...conditions);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(rides)
        .where(where)
        .orderBy(rides.solicitadaEm)
        .limit(params.limit)
        .offset((params.page - 1) * params.limit),
      this.db.select({ value: count() }).from(rides).where(where),
    ]);

    return { rows, total: totalRows[0]?.value ?? 0 };
  }
}
