import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Usuários administrativos do painel ops. Nesta fase só existe o papel
 * "admin" (RBAC multi-papel fica para fase futura — ver docs/business-rules.md).
 */
export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('admin'),
  phone: text('phone'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
