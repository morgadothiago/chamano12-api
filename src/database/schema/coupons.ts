import { boolean, numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { couponTipoDescontoEnum } from './enums';

export const coupons = pgTable('coupons', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  codigo: text('codigo').notNull().unique(),
  tipoDesconto: couponTipoDescontoEnum('tipo_desconto').notNull(),
  valor: numeric('valor', { precision: 10, scale: 2 }).notNull(),
  ativo: boolean('ativo').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type CouponRow = typeof coupons.$inferSelect;
export type NewCouponRow = typeof coupons.$inferInsert;
