import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { users } from './schema';

const SEED_ADMIN_EMAIL = 'admin@example.com';
const SEED_ADMIN_PASSWORD = 'admin123';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não configurada');
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  const existing = await db.select().from(users).where(eq(users.email, SEED_ADMIN_EMAIL));
  if (existing.length > 0) {
    console.log(`Usuário admin (${SEED_ADMIN_EMAIL}) já existe, pulando seed.`);
  } else {
    const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);
    await db.insert(users).values({
      name: 'Admin',
      email: SEED_ADMIN_EMAIL,
      passwordHash,
      role: 'admin',
    });
    console.log(`Usuário admin criado: ${SEED_ADMIN_EMAIL} / ${SEED_ADMIN_PASSWORD}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error('Falha ao rodar seed:', err);
  process.exit(1);
});
