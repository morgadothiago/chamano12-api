import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import { pricingConfig, PricingConfigRow } from '../../database/schema';

const CONFIG_ID = 'default';

@Injectable()
export class PricingRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async getOrCreate(): Promise<PricingConfigRow> {
    const rows = await this.db
      .select()
      .from(pricingConfig)
      .where(eq(pricingConfig.id, CONFIG_ID))
      .limit(1);

    if (rows[0]) return rows[0];

    const [created] = await this.db
      .insert(pricingConfig)
      .values({ id: CONFIG_ID })
      .returning();
    return created;
  }

  async update(data: {
    taxaBase: number;
    valorPorKm: number;
    valorPorMinuto: number;
    valorMinimo: number;
  }): Promise<PricingConfigRow> {
    await this.getOrCreate();

    const [updated] = await this.db
      .update(pricingConfig)
      .set({
        taxaBase: data.taxaBase.toString(),
        valorPorKm: data.valorPorKm.toString(),
        valorPorMinuto: data.valorPorMinuto.toString(),
        valorMinimo: data.valorMinimo.toString(),
        updatedAt: new Date(),
      })
      .where(eq(pricingConfig.id, CONFIG_ID))
      .returning();

    return updated;
  }
}
