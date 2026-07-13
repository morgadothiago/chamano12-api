import { integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

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
  avatarUrl: text('avatar_url'),
  enderecoCep: text('endereco_cep'),
  enderecoLogradouro: text('endereco_logradouro'),
  enderecoNumero: text('endereco_numero'),
  enderecoComplemento: text('endereco_complemento'),
  enderecoBairro: text('endereco_bairro'),
  enderecoCidade: text('endereco_cidade'),
  enderecoUf: varchar('endereco_uf', { length: 2 }),
  // Incrementado a cada login bem-sucedido. O JWT carrega o valor vigente no
  // momento da emissão (`sv`); qualquer request/socket com `sv` diferente do
  // valor atual em banco é de uma sessão anterior e é rejeitado — garante
  // no máximo 1 sessão ativa por conta (login novo derruba o anterior).
  sessionVersion: integer('session_version').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
