import { numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Linha única (id fixo "default") — não há necessidade de múltiplas
 * configurações de tarifa nesta fase, só a "tarifa padrão" que os apps do
 * motorista/passageiro de fato consomem. Bandeiras/preço dinâmico por
 * horário continuam mockados no painel até virarem requisito real.
 */
export const pricingConfig = pgTable('pricing_config', {
  id: text('id').primaryKey().default('default'),
  taxaBase: numeric('taxa_base', { precision: 10, scale: 2 }).notNull().default('5.00'),
  valorPorKm: numeric('valor_por_km', { precision: 10, scale: 2 }).notNull().default('2.50'),
  valorPorMinuto: numeric('valor_por_minuto', { precision: 10, scale: 2 })
    .notNull()
    .default('0.50'),
  valorMinimo: numeric('valor_minimo', { precision: 10, scale: 2 }).notNull().default('10.00'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type PricingConfigRow = typeof pricingConfig.$inferSelect;
export type NewPricingConfigRow = typeof pricingConfig.$inferInsert;
