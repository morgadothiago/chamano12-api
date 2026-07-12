import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { users } from './users';

/**
 * Código de verificação (6 dígitos) pro fluxo "esqueci minha senha". Guarda
 * hash do código (nunca em texto plano) + expiração curta + contador de
 * tentativas, pra permitir rate-limit de brute-force por linha.
 */
export const passwordResetCodes = pgTable('password_reset_codes', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  codeHash: text('code_hash').notNull(),
  attempts: integer('attempts').notNull().default(0),
  expiresAt: timestamp('expires_at').notNull(),
  consumedAt: timestamp('consumed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
