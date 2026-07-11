import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { AppModule } from '../../src/app.module';
import { ResponseInterceptor } from '../../src/shared/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../../src/shared/filters/http-exception.filter';
import * as schema from '../../src/database/schema';

export async function createTestApp(): Promise<INestApplication> {
  if (!process.env.DATABASE_URL_TEST) {
    throw new Error('DATABASE_URL_TEST não configurada — ver .env.example');
  }
  // O AppModule lê DATABASE_URL via ConfigService — apontamos para o banco
  // de teste durante os testes e2e para nunca tocar no banco de dev.
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();

  return app;
}

export async function resetTestDatabase(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_TEST });
  const db = drizzle(pool, { schema });
  await db.execute(sql`delete from driver_documents`);
  await db.execute(sql`delete from rides`);
  await db.execute(sql`delete from drivers`);
  await db.execute(sql`delete from users`);
  await pool.end();
}

export async function seedAdminUser(
  email = 'admin.e2e@example.com',
  password = 'admin123',
): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_TEST });
  const db = drizzle(pool, { schema });
  const passwordHash = await bcrypt.hash(password, 4);
  await db.insert(schema.users).values({
    name: 'Admin E2E',
    email,
    passwordHash,
    role: 'admin',
  });
  await pool.end();
}
