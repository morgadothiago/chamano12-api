import { Inject, Injectable } from '@nestjs/common';
import { and, eq, count, isNull, inArray, sql, desc } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import { rides, users } from '../../database/schema';
import type { RideRow } from '../../database/schema';
import { ICreateRide, RideStatus, RideCanceladoPor } from './interfaces/ride.interface';

@Injectable()
export class RidesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findById(id: string): Promise<RideRow | null> {
    const rows = await this.db.select().from(rides).where(eq(rides.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async findPassengerAvatarUrl(passengerId: string): Promise<string | null> {
    const rows = await this.db
      .select({ avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, passengerId))
      .limit(1);
    return rows[0]?.avatarUrl ?? null;
  }

  async createRideRequest(data: ICreateRide): Promise<RideRow> {
    const [ride] = await this.db
      .insert(rides)
      .values({
        passengerId: data.passengerId ?? null,
        passengerName: data.passengerName,
        passengerPhone: data.passengerPhone ?? null,
        origem: data.origem,
        origemLat: String(data.origemLat),
        origemLng: String(data.origemLng),
        destino: data.destino,
        destinoLat: String(data.destinoLat),
        destinoLng: String(data.destinoLng),
        status: 'solicitada',
        distanciaKm: data.distanciaKm != null ? String(data.distanciaKm) : null,
        valor: data.valor != null ? String(data.valor) : null,
        formaPagamento: data.formaPagamento ?? null,
        solicitadaEm: new Date(),
      })
      .returning();
    return ride;
  }

  async acceptRide(id: string, driverId: string): Promise<RideRow | null> {
    const [ride] = await this.db
      .update(rides)
      .set({
        driverId,
        status: 'aceita',
        aceitaEm: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(rides.id, id), eq(rides.status, 'solicitada')))
      .returning();
    return ride ?? null;
  }

  async startRide(id: string): Promise<RideRow | null> {
    const [ride] = await this.db
      .update(rides)
      .set({ status: 'iniciada', iniciadaEm: new Date(), updatedAt: new Date() })
      .where(and(eq(rides.id, id), eq(rides.status, 'aceita')))
      .returning();
    return ride ?? null;
  }

  async completeRide(id: string): Promise<RideRow | null> {
    const [ride] = await this.db
      .update(rides)
      .set({ status: 'finalizada', finalizadaEm: new Date(), updatedAt: new Date() })
      .where(and(eq(rides.id, id), eq(rides.status, 'iniciada')))
      .returning();
    return ride ?? null;
  }

  async rateRide(id: string, avaliacao: number, tags?: string[]): Promise<RideRow | null> {
    const [ride] = await this.db
      .update(rides)
      .set({ avaliacao, avaliacaoTags: tags ?? null, updatedAt: new Date() })
      .where(and(eq(rides.id, id), eq(rides.status, 'finalizada')))
      .returning();
    return ride ?? null;
  }

  async cancelRide(
    id: string,
    canceladoPor: RideCanceladoPor,
    motivo?: string,
  ): Promise<RideRow | null> {
    const [ride] = await this.db
      .update(rides)
      .set({
        status: 'cancelada',
        canceladaEm: new Date(),
        canceladoPor,
        motivoCancelamento: motivo ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(rides.id, id), inArray(rides.status, ['solicitada', 'aceita'])))
      .returning();
    return ride ?? null;
  }

  async findPendingByPassenger(passengerId: string): Promise<RideRow | null> {
    const rows = await this.db
      .select()
      .from(rides)
      .where(
        and(
          eq(rides.passengerId, passengerId),
          inArray(rides.status, ['solicitada', 'aceita', 'iniciada']),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Corrida em andamento (aceita ou iniciada) do passageiro — usada pro app
   * restaurar o estado ao reabrir com uma corrida ativa em vez de cair na
   * tela de "pedir corrida" do zero.
   */
  async findActiveByDriver(driverRecordId: string): Promise<RideRow | null> {
    const rows = await this.db
      .select()
      .from(rides)
      .where(
        and(
          eq(rides.driverId, driverRecordId),
          inArray(rides.status, ['aceita', 'iniciada']),
        ),
      )
      .orderBy(desc(rides.solicitadaEm))
      .limit(1);
    return rows[0] ?? null;
  }

  async findActiveByPassenger(passengerId: string): Promise<RideRow | null> {
    const rows = await this.db
      .select()
      .from(rides)
      .where(
        and(
          eq(rides.passengerId, passengerId),
          inArray(rides.status, ['solicitada', 'aceita', 'iniciada']),
        ),
      )
      .orderBy(desc(rides.solicitadaEm))
      .limit(1);
    return rows[0] ?? null;
  }

  async findMany(params: {
    status?: string;
    driverId?: string;
    passengerId?: string;
    page: number;
    limit: number;
  }) {
    const conditions = [];
    if (params.status) conditions.push(eq(rides.status, params.status as RideStatus));
    if (params.driverId) conditions.push(eq(rides.driverId, params.driverId));
    if (params.passengerId) conditions.push(eq(rides.passengerId, params.passengerId));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

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
}
