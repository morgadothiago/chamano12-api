import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../../../database/schema';
import { DriversRepository } from '../drivers.repository';
import { DrizzleDb } from '../../../database/database.module';

/**
 * Testes de integração — rodam contra DATABASE_URL_TEST (Postgres real, não
 * mockado). Requer migrations já aplicadas nesse banco (ver README.md /
 * "npm run db:migrate" com DATABASE_URL apontando pro banco de teste).
 */
describe('DriversRepository (integration)', () => {
  let pool: Pool;
  let db: DrizzleDb;
  let repo: DriversRepository;

  beforeAll(() => {
    const connectionString = process.env.DATABASE_URL_TEST;
    if (!connectionString) {
      throw new Error('DATABASE_URL_TEST não configurada — ver .env.example');
    }
    pool = new Pool({ connectionString });
    db = drizzle(pool, { schema });
    repo = new DriversRepository(db);
  });

  afterEach(async () => {
    await db.execute(sql`delete from driver_documents`);
    await db.execute(sql`delete from rides`);
    await db.execute(sql`delete from drivers`);
  });

  afterAll(async () => {
    await pool.end();
  });

  const baseDriver = {
    nome: 'Maria Teste',
    email: 'maria.integration@example.com',
    telefone: '11988887777',
    cnh: '99988877766',
    veiculo: { placa: 'XYZ9A87', modelo: 'HB20', ano: 2021 },
    endereco: { cep: '01310100', logradouro: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' },
  };

  it('creates a driver with 3 pendente documents and status pendente', async () => {
    const driver = await repo.create(baseDriver);

    expect(driver.status).toBe('pendente');

    const documents = await repo.findDocuments(driver.id);
    expect(documents).toHaveLength(3);
    expect(documents.every((d) => d.status === 'pendente')).toBe(true);
    expect(documents.map((d) => d.tipo).sort()).toEqual(['cnh', 'crlv', 'foto_veiculo']);
  });

  it('findById returns null for unknown id', async () => {
    const result = await repo.findById('00000000-0000-0000-0000-000000000000');
    expect(result).toBeNull();
  });

  it('findMany filters by status and paginates', async () => {
    const d1 = await repo.create({ ...baseDriver, email: 'a@integration.com' });
    const d2 = await repo.create({ ...baseDriver, email: 'b@integration.com' });
    await repo.updateStatus(d1.id, 'ativo');

    const ativos = await repo.findMany({ status: 'ativo', page: 1, limit: 10 });
    expect(ativos.rows).toHaveLength(1);
    expect(ativos.rows[0].id).toBe(d1.id);

    const all = await repo.findMany({ page: 1, limit: 1 });
    expect(all.rows).toHaveLength(1);
    expect(all.total).toBe(2);
    void d2;
  });

  it('findMany search filters by nome (case-insensitive)', async () => {
    await repo.create({ ...baseDriver, nome: 'Carlos Andrade', email: 'carlos@integration.com' });
    await repo.create({ ...baseDriver, nome: 'Beatriz Lima', email: 'beatriz@integration.com' });

    const result = await repo.findMany({ search: 'carlos', page: 1, limit: 10 });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].nome).toBe('Carlos Andrade');
  });

  it('reviewDocument sets status, revisadoPor and motivoRejeicao', async () => {
    const driver = await repo.create(baseDriver);

    const reviewed = await repo.reviewDocument(
      driver.id,
      'cnh',
      'rejeitado',
      'admin-1',
      'foto ruim',
    );

    expect(reviewed?.status).toBe('rejeitado');
    expect(reviewed?.revisadoPor).toBe('admin-1');
    expect(reviewed?.motivoRejeicao).toBe('foto ruim');
  });

  it('upsertDocumentUpload resets status to pendente and stores arquivoUrl', async () => {
    const driver = await repo.create(baseDriver);
    await repo.reviewDocument(driver.id, 'cnh', 'aprovado', 'admin-1');

    const updated = await repo.upsertDocumentUpload(driver.id, 'cnh', '/uploads/drivers/x/cnh.png');

    expect(updated?.status).toBe('pendente');
    expect(updated?.arquivoUrl).toBe('/uploads/drivers/x/cnh.png');
  });

  it('update patches only the provided fields (nome + veiculo.placa)', async () => {
    const driver = await repo.create(baseDriver);

    const updated = await repo.update(driver.id, {
      nome: 'Novo Nome',
      veiculo: { placa: 'NEW1A23' } as never,
    });

    expect(updated?.nome).toBe('Novo Nome');
    expect(updated?.veiculoPlaca).toBe('NEW1A23');
    expect(updated?.email).toBe(baseDriver.email);
  });

  it('update returns null for an unknown id', async () => {
    const result = await repo.update('00000000-0000-0000-0000-000000000000', { nome: 'X' });
    expect(result).toBeNull();
  });

  it('upsertDocumentUpload inserts a new document row when none exists yet', async () => {
    const driver = await repo.create(baseDriver);
    await db.execute(
      sql`delete from driver_documents where driver_id = ${driver.id} and tipo = 'cnh'`,
    );

    const result = await repo.upsertDocumentUpload(driver.id, 'cnh', '/uploads/x/cnh.png');

    expect(result?.status).toBe('pendente');
    expect(result?.arquivoUrl).toBe('/uploads/x/cnh.png');
  });

  it('findTrips filters by from/to date range', async () => {
    const driver = await repo.create(baseDriver);
    await db.insert(schema.rides).values([
      {
        driverId: driver.id,
        passengerName: 'Passageiro A',
        origem: 'A',
        origemLat: '-23.5505000',
        origemLng: '-46.6333000',
        destino: 'B',
        destinoLat: '-23.5610000',
        destinoLng: '-46.6560000',
        status: 'finalizada',
        solicitadaEm: new Date('2026-01-15'),
        valor: '10.00',
        avaliacao: 5,
      },
      {
        driverId: driver.id,
        passengerName: 'Passageiro C',
        origem: 'C',
        origemLat: '-23.5505000',
        origemLng: '-46.6333000',
        destino: 'D',
        destinoLat: '-23.5610000',
        destinoLng: '-46.6560000',
        status: 'finalizada',
        solicitadaEm: new Date('2026-06-15'),
        valor: '20.00',
        avaliacao: 4,
      },
    ]);

    const result = await repo.findTrips(driver.id, {
      page: 1,
      limit: 10,
      from: '2026-05-01',
      to: '2026-12-31',
    });

    expect(result.total).toBe(1);
    expect(result.rows[0].origem).toBe('C');
  });

  it('getMetrics returns zeroed aggregation when driver has no rides', async () => {
    const driver = await repo.create(baseDriver);

    const metrics = await repo.getMetrics(driver.id);

    expect(metrics).toEqual({ corridas: 0, avaliacaoMedia: 0, ganhos: 0 });
  });

  it('findTrips returns an empty paginated stub for a driver with no rides', async () => {
    const driver = await repo.create(baseDriver);

    const result = await repo.findTrips(driver.id, { page: 1, limit: 20 });

    expect(result).toEqual({ rows: [], total: 0 });
  });
});
