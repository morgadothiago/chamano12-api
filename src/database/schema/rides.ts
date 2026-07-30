import { numeric, pgTable, text, timestamp, integer, index, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { drivers } from './drivers';
import { rideStatusEnum, rideCanceladoPorEnum, rideFormaPagamentoEnum } from './enums';

export const rides = pgTable(
  'rides',
  {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  // Motorista (opcional até ser aceita)
  driverId: text('driver_id')
    .references(() => drivers.id, { onDelete: 'set null' }),

  // Passageiro
  passengerId: text('passenger_id'),
  passengerName: text('passenger_name').notNull(),
  passengerPhone: text('passenger_phone'),

  // Origem
  origem: text('origem').notNull(),
  origemLat: numeric('origem_lat', { precision: 10, scale: 7 }).notNull(),
  origemLng: numeric('origem_lng', { precision: 10, scale: 7 }).notNull(),

  // Destino
  destino: text('destino').notNull(),
  destinoLat: numeric('destino_lat', { precision: 10, scale: 7 }).notNull(),
  destinoLng: numeric('destino_lng', { precision: 10, scale: 7 }).notNull(),

  // Status da corrida
  status: rideStatusEnum('status').notNull().default('solicitada'),

  // Valor
  valor: numeric('valor', { precision: 10, scale: 2 }),
  distanciaKm: numeric('distancia_km', { precision: 8, scale: 2 }),
  formaPagamento: rideFormaPagamentoEnum('forma_pagamento'),

  // Avaliação (só após finalizada)
  avaliacao: integer('avaliacao'),
  avaliacaoTags: text('avaliacao_tags').array(),

  // Timestamps de transições
  solicitadaEm: timestamp('solicitada_em').defaultNow().notNull(),
  aceitaEm: timestamp('aceita_em'),
  iniciadaEm: timestamp('iniciada_em'),
  finalizadaEm: timestamp('finalizada_em'),
  canceladaEm: timestamp('cancelada_em'),
  canceladoPor: rideCanceladoPorEnum('cancelado_por'),
  motivoCancelamento: text('motivo_cancelamento'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('rides_driver_id_status_idx').on(table.driverId, table.status),
    index('rides_passenger_id_status_idx').on(table.passengerId, table.status),
    index('rides_status_idx').on(table.status),
  ],
);

export const ridesRelations = relations(rides, ({ one }) => ({
  driver: one(drivers, {
    fields: [rides.driverId],
    references: [drivers.id],
  }),
}));

export type RideRow = typeof rides.$inferSelect;
export type NewRideRow = typeof rides.$inferInsert;
