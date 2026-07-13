import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import { users } from '../../database/schema';
import * as bcrypt from 'bcrypt';

export interface IUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  phone: string | null;
  sessionVersion: number;
}

@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findByEmail(email: string): Promise<IUserRecord | null> {
    const rows = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<IUserRecord | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async create(data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    phone?: string;
  }): Promise<IUserRecord> {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const [user] = await this.db
      .insert(users)
      .values({
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role ?? 'driver',
        phone: data.phone ?? null,
      })
      .returning();
    return user;
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  /**
   * Incrementa a versão de sessão e retorna o novo valor — chamado a cada
   * login. Invalida automaticamente qualquer JWT/socket emitido antes desse
   * ponto (garante no máximo 1 sessão ativa por conta).
   */
  async incrementSessionVersion(userId: string): Promise<number> {
    const [row] = await this.db
      .update(users)
      .set({ sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ sessionVersion: users.sessionVersion });
    return row.sessionVersion;
  }
}
