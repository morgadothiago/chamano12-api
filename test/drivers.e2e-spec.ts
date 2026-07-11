import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetTestDatabase, seedAdminUser } from './utils/test-app';

describe('DriversModule (e2e)', () => {
  let app: INestApplication;
  let token: string;

  const email = 'admin.drivers.e2e@example.com';
  const password = 'admin123';

  const validDriverPayload = {
    nome: 'Motorista E2E',
    email: 'motorista.e2e@example.com',
    telefone: '11977776666',
    cnh: '55544433322',
    veiculo: { placa: 'DEF4G56', modelo: 'Corolla', ano: 2023 },
  };

  beforeAll(async () => {
    await resetTestDatabase();
    await seedAdminUser(email, password);
    app = await createTestApp();

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    token = login.body.data.token;
  });

  afterAll(async () => {
    await app.close();
    await resetTestDatabase();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  describe('POST /api/v1/drivers', () => {
    it('creates driver as pendente with 3 pendente documents and zeroed metrics -> 201', () =>
      request(app.getHttpServer())
        .post('/api/v1/drivers')
        .set(auth())
        .send(validDriverPayload)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.status).toBe('pendente');
          expect(res.body.data.documentos).toHaveLength(3);
          expect(
            res.body.data.documentos.every((d: { status: string }) => d.status === 'pendente'),
          ).toBe(true);
          expect(res.body.data.metrics).toEqual({ corridas: 0, avaliacaoMedia: 0, ganhos: 0 });
          expect(res.body.data.localizacaoAtual).toBeNull();
        }));

    it('rejects missing required fields -> 400', () =>
      request(app.getHttpServer())
        .post('/api/v1/drivers')
        .set(auth())
        .send({ nome: 'Só o nome' })
        .expect(400));

    it('rejects without auth -> 401', () =>
      request(app.getHttpServer()).post('/api/v1/drivers').send(validDriverPayload).expect(401));
  });

  describe('full lifecycle', () => {
    let driverId: string;

    it('GET /api/v1/drivers/:id -> 404 for unknown id', () =>
      request(app.getHttpServer())
        .get('/api/v1/drivers/00000000-0000-0000-0000-000000000000')
        .set(auth())
        .expect(404)
        .expect((res) => {
          expect(res.body.error.code).toBe('DRIVER_NOT_FOUND');
        }));

    it('creates a fresh driver for the lifecycle test', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/drivers')
        .set(auth())
        .send({ ...validDriverPayload, email: 'lifecycle.e2e@example.com' })
        .expect(201);
      driverId = res.body.data.id;
      expect(driverId).toEqual(expect.any(String));
    });

    it('PATCH /api/v1/drivers/:id updates cadastral data -> 200', () =>
      request(app.getHttpServer())
        .patch(`/api/v1/drivers/${driverId}`)
        .set(auth())
        .send({ nome: 'Nome Atualizado' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.nome).toBe('Nome Atualizado');
        }));

    it('PATCH /api/v1/drivers/:id rejects status field in body -> 400', () =>
      request(app.getHttpServer())
        .patch(`/api/v1/drivers/${driverId}`)
        .set(auth())
        .send({ status: 'ativo' })
        .expect(400));

    it('POST /api/v1/drivers/:id/approve -> 422 DOCUMENTS_NOT_APPROVED before documents are approved', () =>
      request(app.getHttpServer())
        .post(`/api/v1/drivers/${driverId}/approve`)
        .set(auth())
        .expect(422)
        .expect((res) => {
          expect(res.body.error.code).toBe('DOCUMENTS_NOT_APPROVED');
        }));

    it('PATCH /api/v1/drivers/:id/documents/:tipo approves each required document', async () => {
      for (const tipo of ['cnh', 'crlv', 'foto_veiculo']) {
        await request(app.getHttpServer())
          .patch(`/api/v1/drivers/${driverId}/documents/${tipo}`)
          .set(auth())
          .send({ status: 'aprovado' })
          .expect(200);
      }
    });

    it('POST /api/v1/drivers/:id/approve -> 200 once all documents are aprovado', () =>
      request(app.getHttpServer())
        .post(`/api/v1/drivers/${driverId}/approve`)
        .set(auth())
        .expect(200)
        .expect((res) => {
          expect(res.body.data.status).toBe('ativo');
        }));

    it('POST /api/v1/drivers/:id/deactivate -> 200', () =>
      request(app.getHttpServer())
        .post(`/api/v1/drivers/${driverId}/deactivate`)
        .set(auth())
        .expect(200)
        .expect((res) => {
          expect(res.body.data.status).toBe('inativo');
        }));

    it('POST /api/v1/drivers/:id/activate -> 200', () =>
      request(app.getHttpServer())
        .post(`/api/v1/drivers/${driverId}/activate`)
        .set(auth())
        .expect(200)
        .expect((res) => {
          expect(res.body.data.status).toBe('ativo');
        }));

    it('GET /api/v1/drivers/:id/trips -> 200 paginated empty stub', () =>
      request(app.getHttpServer())
        .get(`/api/v1/drivers/${driverId}/trips`)
        .set(auth())
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toEqual([]);
          expect(res.body.meta).toEqual({ page: 1, total: 0, limit: 20 });
        }));

    it('POST /api/v1/drivers/:id/reject soft-deletes (status rejeitado, record preserved) -> 200', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/drivers/${driverId}/reject`)
        .set(auth())
        .send({ motivo: 'documentação inconsistente' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.status).toBe('rejeitado');
        });

      // registro continua acessível (soft delete, não hard delete)
      await request(app.getHttpServer())
        .get(`/api/v1/drivers/${driverId}`)
        .set(auth())
        .expect(200)
        .expect((res) => {
          expect(res.body.data.status).toBe('rejeitado');
        });
    });

    it('POST /api/v1/drivers/:id/activate refuses transition out of rejeitado -> 400', () =>
      request(app.getHttpServer())
        .post(`/api/v1/drivers/${driverId}/activate`)
        .set(auth())
        .expect(400)
        .expect((res) => {
          expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
        }));
  });

  describe('GET /api/v1/drivers', () => {
    it('lists drivers with pagination meta -> 200', () =>
      request(app.getHttpServer())
        .get('/api/v1/drivers?page=1&limit=5')
        .set(auth())
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.meta).toEqual(expect.objectContaining({ page: 1, limit: 5 }));
        }));

    it('rejects without auth -> 401', () =>
      request(app.getHttpServer()).get('/api/v1/drivers').expect(401));
  });

  describe('POST /api/v1/drivers/:id/documents/:tipo/upload', () => {
    it('uploads a file and sets document back to pendente -> 200', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/drivers')
        .set(auth())
        .send({ ...validDriverPayload, email: 'upload.e2e@example.com' })
        .expect(201);

      const id = created.body.data.id;

      return request(app.getHttpServer())
        .post(`/api/v1/drivers/${id}/documents/cnh/upload`)
        .set(auth())
        .attach('file', Buffer.from('conteudo-fake'), 'cnh.png')
        .expect(200)
        .expect((res) => {
          const cnhDoc = res.body.data.documentos.find((d: { tipo: string }) => d.tipo === 'cnh');
          expect(cnhDoc.status).toBe('pendente');
          expect(cnhDoc.arquivoUrl).toMatch(/^\/uploads\/drivers\//);
        });
    });

    it('rejects invalid tipo -> 400', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/drivers')
        .set(auth())
        .send({ ...validDriverPayload, email: 'upload2.e2e@example.com' })
        .expect(201);

      return request(app.getHttpServer())
        .post(`/api/v1/drivers/${created.body.data.id}/documents/invalido/upload`)
        .set(auth())
        .attach('file', Buffer.from('x'), 'x.png')
        .expect(400);
    });
  });
});
