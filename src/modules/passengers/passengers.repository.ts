import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, or, sum } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import { rides, users } from '../../database/schema';

export interface PassengerListParams {
  search?: string;
  page: number;
  limit: number;
}

@Injectable()
export class PassengersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findMany(params: PassengerListParams) {
    const { search, page, limit } = params;

    const conditions = [eq(users.role, 'passenger')];
    if (search) {
      conditions.push(
        or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))!,
      );
    }
    const where = and(...conditions);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(users)
        .where(where)
        .orderBy(users.createdAt)
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ value: count() }).from(users).where(where),
    ]);

    return { rows, total: totalRows[0]?.value ?? 0 };
  }

  async findById(id: string) {
    const rows = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.role, 'passenger')))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Histórico paginado de corridas finalizadas do passageiro. `rides.passengerId`
   * só bate com `users.id` quando o passageiro está logado (JWT) no WebSocket
   * — ver `ws-passenger.gateway.ts` `handleConnection`.
   */
  async findTrips(
    passengerId: string,
    params: { page: number; limit: number },
  ) {
    const where = and(eq(rides.passengerId, passengerId), eq(rides.status, 'finalizada'));

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(rides)
        .where(where)
        .orderBy(desc(rides.solicitadaEm))
        .limit(params.limit)
        .offset((params.page - 1) * params.limit),
      this.db.select({ value: count() }).from(rides).where(where),
    ]);

    return { rows, total: totalRows[0]?.value ?? 0 };
  }

  async getMetrics(passengerId: string) {
    const [row] = await this.db
      .select({ totalCorridas: count(), totalGasto: sum(rides.valor) })
      .from(rides)
      .where(eq(rides.passengerId, passengerId));

    return {
      totalCorridas: row?.totalCorridas ?? 0,
      totalGasto: Number(row?.totalGasto ?? 0),
    };
  }

  async updateProfile(
    userId: string,
    data: {
      cep: string;
      logradouro: string;
      numero: string;
      complemento?: string;
      bairro: string;
      cidade: string;
      uf: string;
    },
  ) {
    await this.db
      .update(users)
      .set({
        enderecoCep: data.cep,
        enderecoLogradouro: data.logradouro,
        enderecoNumero: data.numero,
        enderecoComplemento: data.complemento ?? null,
        enderecoBairro: data.bairro,
        enderecoCidade: data.cidade,
        enderecoUf: data.uf.toUpperCase(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    await this.db.update(users).set({ avatarUrl, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async update(id: string, data: { nome?: string; email?: string; telefone?: string }) {
    const values: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (data.nome !== undefined) values.name = data.nome;
    if (data.email !== undefined) values.email = data.email;
    if (data.telefone !== undefined) values.phone = data.telefone;

    const [row] = await this.db
      .update(users)
      .set(values)
      .where(and(eq(users.id, id), eq(users.role, 'passenger')))
      .returning();
    return row ?? null;
  }

  async setStatus(id: string, status: string) {
    const [row] = await this.db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(users.id, id), eq(users.role, 'passenger')))
      .returning();
    return row ?? null;
  }
}
