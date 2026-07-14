import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import { coupons } from '../../database/schema';
import type { CouponRow } from '../../database/schema';

export interface ICreateCoupon {
  codigo: string;
  tipoDesconto: 'percentual' | 'fixo';
  valor: number;
}

export interface IUpdateCoupon {
  tipoDesconto?: 'percentual' | 'fixo';
  valor?: number;
  ativo?: boolean;
}

@Injectable()
export class CouponsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findAll(): Promise<CouponRow[]> {
    return this.db.select().from(coupons).orderBy(desc(coupons.createdAt));
  }

  async findById(id: string): Promise<CouponRow | null> {
    const rows = await this.db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async findByCodigo(codigo: string): Promise<CouponRow | null> {
    const rows = await this.db.select().from(coupons).where(eq(coupons.codigo, codigo)).limit(1);
    return rows[0] ?? null;
  }

  async create(data: ICreateCoupon): Promise<CouponRow> {
    const [row] = await this.db
      .insert(coupons)
      .values({
        codigo: data.codigo,
        tipoDesconto: data.tipoDesconto,
        valor: String(data.valor),
      })
      .returning();
    return row;
  }

  async update(id: string, data: IUpdateCoupon): Promise<CouponRow | null> {
    const values: Partial<typeof coupons.$inferInsert> = { updatedAt: new Date() };
    if (data.tipoDesconto !== undefined) values.tipoDesconto = data.tipoDesconto;
    if (data.valor !== undefined) values.valor = String(data.valor);
    if (data.ativo !== undefined) values.ativo = data.ativo;

    const [row] = await this.db
      .update(coupons)
      .set(values)
      .where(eq(coupons.id, id))
      .returning();
    return row ?? null;
  }
}
