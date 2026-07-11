import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não configurada');
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  console.log(`Rodando migrations em ${connectionString}...`);
  await migrate(db, { migrationsFolder: './src/database/migrations' });
  console.log('Migrations aplicadas com sucesso.');

  await pool.end();
}

main().catch((err) => {
  console.error('Falha ao rodar migrations:', err);
  process.exit(1);
});
