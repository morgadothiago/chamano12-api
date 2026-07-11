import { Inject, Injectable } from '@nestjs/common';
import { and, eq, count, isNull, inArray, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import { rides } from '../../database/schema';
import type { RideRow } from '../../database/schema';
import { ICreateRide, RideStatus, RideCanceladoPor } from './interfaces/ride.interface';

@Injectable()
export class RidesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findById(id: string): Promise<RideRow | null> {
    const rows = await this.db.select().from(rides).where(eq(rides.id, id)).limit(1);
    return rows[0] ?? null;
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
        distanciaKm: data.distanciaKm ? String(data.distanciaKm) : null,
        valor: data.valor ? String(data.valor) : null,
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
          inArray(rides.status, ['solicitada', 'aceita']),
        ),
      )
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
        .orderBy(rides.solicitadaEm)
        .limit(params.limit)
        .offset((params.page - 1) * params.limit),
      this.db.select({ value: count() }).from(rides).where(where),
    ]);

    return { rows, total: totalRows[0]?.value ?? 0 };
  }
}
