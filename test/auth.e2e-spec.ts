import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetTestDatabase, seedAdminUser } from './utils/test-app';

describe('AuthModule (e2e)', () => {
  let app: INestApplication;
  const email = 'admin.auth.e2e@example.com';
  const password = 'admin123';

  beforeAll(async () => {
    await resetTestDatabase();
    await seedAdminUser(email, password);
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await resetTestDatabase();
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns token and user for valid credentials', () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.token).toEqual(expect.any(String));
          expect(res.body.data.user.email).toBe(email);
        }));

    it('rejects invalid credentials with 401', () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'wrong-password' })
        .expect(401)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
        }));

    it('rejects malformed body with 400', () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email' })
        .expect(400));
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns current user with a valid token', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password });

      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${login.body.data.token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.email).toBe(email);
        });
    });

    it('returns 401 without a token', () =>
      request(app.getHttpServer()).get('/api/v1/auth/me').expect(401));
  });

  describe('POST /api/v1/auth/logout', () => {
    it('returns 200 with a valid token', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password });

      return request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${login.body.data.token}`)
        .expect(200);
    });

    it('returns 401 without a token', () =>
      request(app.getHttpServer()).post('/api/v1/auth/logout').expect(401));
  });
});
