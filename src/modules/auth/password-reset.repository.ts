import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';

import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import { passwordResetCodes } from '../../database/schema';

export interface IPasswordResetCodeRecord {
  id: string;
  userId: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
}

const MAX_ATTEMPTS = 5;

@Injectable()
export class PasswordResetRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async create(userId: string, codeHash: string, expiresAt: Date): Promise<void> {
    await this.db.insert(passwordResetCodes).values({ userId, codeHash, expiresAt });
  }

  async findLatestActive(userId: string): Promise<IPasswordResetCodeRecord | null> {
    const rows = await this.db
      .select()
      .from(passwordResetCodes)
      .where(and(eq(passwordResetCodes.userId, userId), isNull(passwordResetCodes.consumedAt)))
      .orderBy(desc(passwordResetCodes.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }

  async incrementAttempts(id: string, currentAttempts: number): Promise<boolean> {
    const nextAttempts = currentAttempts + 1;
    await this.db
      .update(passwordResetCodes)
      .set({ attempts: nextAttempts })
      .where(eq(passwordResetCodes.id, id));
    return nextAttempts >= MAX_ATTEMPTS;
  }

  async markConsumed(id: string): Promise<void> {
    await this.db
      .update(passwordResetCodes)
      .set({ consumedAt: new Date() })
      .where(eq(passwordResetCodes.id, id));
  }
}
