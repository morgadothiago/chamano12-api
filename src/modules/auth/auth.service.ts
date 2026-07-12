import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';
import { UsersRepository } from './users.repository';
import { PasswordResetRepository } from './password-reset.repository';
import { ILoginResult, IAuthUser } from './interfaces/auth.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { MailService } from '../../shared/mail/mail.service';

const RESET_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutos

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly mailService: MailService,
  ) {}

  async login(email: string, password: string): Promise<ILoginResult> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou senha inválidos.',
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou senha inválidos.',
      });
    }

    return this.buildLoginResult(user);
  }

  async register(data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    phone?: string;
  }): Promise<ILoginResult> {
    const existing = await this.usersRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Já existe uma conta com este email.',
      });
    }

    const user = await this.usersRepository.create(data);
    return this.buildLoginResult(user);
  }

  async me(userId: string): Promise<IAuthUser> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Usuário não encontrado.',
      });
    }
    return { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone };
  }

  /**
   * Sempre responde com sucesso genérico (mesmo se o email não existir) pra
   * não permitir enumeração de contas via esse endpoint.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      return;
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);

    await this.passwordResetRepository.create(user.id, codeHash, expiresAt);
    await this.mailService.sendPasswordResetCode(user.email, user.name, code);
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const invalidCodeError = new BadRequestException({
      code: 'INVALID_RESET_CODE',
      message: 'Código inválido ou expirado.',
    });

    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw invalidCodeError;
    }

    const record = await this.passwordResetRepository.findLatestActive(user.id);
    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw invalidCodeError;
    }

    const codeMatches = await bcrypt.compare(code, record.codeHash);
    if (!codeMatches) {
      const exceededMaxAttempts = await this.passwordResetRepository.incrementAttempts(
        record.id,
        record.attempts,
      );
      if (exceededMaxAttempts) {
        await this.passwordResetRepository.markConsumed(record.id);
      }
      throw invalidCodeError;
    }

    await this.passwordResetRepository.markConsumed(record.id);
    await this.usersRepository.updatePassword(user.id, newPassword);
  }

  private async buildLoginResult(user: {
    id: string;
    name: string;
    email: string;
    role: string;
    phone: string | null;
  }): Promise<ILoginResult> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone },
    };
  }
}
