import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../../../database/schema';
import { UsersRepository } from '../users.repository';
import { DrizzleDb } from '../../../database/database.module';

describe('UsersRepository (integration)', () => {
  let pool: Pool;
  let db: DrizzleDb;
  let repo: UsersRepository;

  beforeAll(() => {
    const connectionString = process.env.DATABASE_URL_TEST;
    if (!connectionString) {
      throw new Error('DATABASE_URL_TEST não configurada — ver .env.example');
    }
    pool = new Pool({ connectionString });
    db = drizzle(pool, { schema });
    repo = new UsersRepository(db);
  });

  afterEach(async () => {
    await db.execute(sql`delete from users`);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('findByEmail returns the user when it exists', async () => {
    await db.insert(schema.users).values({
      name: 'Admin Teste',
      email: 'admin.repo@example.com',
      passwordHash: 'hash',
      role: 'admin',
    });

    const user = await repo.findByEmail('admin.repo@example.com');

    expect(user?.name).toBe('Admin Teste');
  });

  it('findByEmail returns null when the user does not exist', async () => {
    const user = await repo.findByEmail('nope@example.com');
    expect(user).toBeNull();
  });

  it('findById returns the user when it exists', async () => {
    const [inserted] = await db
      .insert(schema.users)
      .values({ name: 'Por Id', email: 'porid@example.com', passwordHash: 'hash', role: 'admin' })
      .returning();

    const user = await repo.findById(inserted.id);

    expect(user?.email).toBe('porid@example.com');
  });

  it('findById returns null for an unknown id', async () => {
    const user = await repo.findById('00000000-0000-0000-0000-000000000000');
    expect(user).toBeNull();
  });
});
