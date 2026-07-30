import { boolean, integer, numeric, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { driverStatusEnum } from './enums';
import { users } from './users';
import { driverDocuments } from './driver-documents';
import { rides } from './rides';

export const drivers = pgTable('drivers', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'set null' })
    .unique(),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  telefone: text('telefone').notNull(),
  cnh: text('cnh').notNull(),
  status: driverStatusEnum('status').notNull().default('pendente'),
  avatarUrl: text('avatar_url'),

  // veiculo embutido (não há necessidade de tabela própria nesta fase)
  veiculoPlaca: text('veiculo_placa').notNull(),
  veiculoModelo: text('veiculo_modelo').notNull(),
  veiculoAno: integer('veiculo_ano').notNull(),

  // endereco do motorista
  enderecoCep: text('endereco_cep').notNull(),
  enderecoLogradouro: text('endereco_logradouro').notNull(),
  enderecoNumero: text('endereco_numero').notNull(),
  enderecoComplemento: text('endereco_complemento'),
  enderecoBairro: text('endereco_bairro').notNull(),
  enderecoCidade: text('endereco_cidade').notNull(),
  enderecoUf: varchar('endereco_uf', { length: 2 }).notNull(),

  // localizacaoAtual — null enquanto motorista não está em rota
  localizacaoLat: numeric('localizacao_lat', { precision: 10, scale: 7 }),
  localizacaoLng: numeric('localizacao_lng', { precision: 10, scale: 7 }),

  // Intenção persistida do motorista (ligou/desligou o toggle "Ficar
  // Online"), separada do estado em memória do `DriverLocationStore` — uma
  // queda de socket (rede, app em background) não deve derrubar isso.
  // Sem essa persistência, reconectar depois de qualquer desconexão sem
  // corrida ativa não tinha como saber que o motorista pretendia continuar
  // disponível, e só um toggle manual (offline -> online) recriava a
  // entrada de disponibilidade no servidor.
  online: boolean('online').notNull().default(false),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const driversRelations = relations(drivers, ({ one, many }) => ({
  user: one(users, { fields: [drivers.userId], references: [users.id] }),
  documentos: many(driverDocuments),
  corridas: many(rides),
}));

export type DriverRow = typeof drivers.$inferSelect;
export type NewDriverRow = typeof drivers.$inferInsert;
