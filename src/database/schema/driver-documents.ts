import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { documentStatusEnum, documentTipoEnum } from './enums';
import { drivers } from './drivers';

/**
 * Um registro por (driver, tipo). Os 3 tipos (cnh, crlv, foto_veiculo) são
 * criados automaticamente com status "pendente" na criação do motorista
 * (ver DriversService.create).
 */
export const driverDocuments = pgTable('driver_documents', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  driverId: text('driver_id')
    .notNull()
    .references(() => drivers.id, { onDelete: 'cascade' }),
  tipo: documentTipoEnum('tipo').notNull(),
  status: documentStatusEnum('status').notNull().default('pendente'),
  enviadoEm: timestamp('enviado_em').defaultNow().notNull(),
  arquivoUrl: text('arquivo_url'),
  revisadoPor: text('revisado_por'),
  motivoRejeicao: text('motivo_rejeicao'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const driverDocumentsRelations = relations(driverDocuments, ({ one }) => ({
  driver: one(drivers, {
    fields: [driverDocuments.driverId],
    references: [drivers.id],
  }),
}));

export type DriverDocumentRow = typeof driverDocuments.$inferSelect;
export type NewDriverDocumentRow = typeof driverDocuments.$inferInsert;
