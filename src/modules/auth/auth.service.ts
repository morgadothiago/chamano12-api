import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { ILoginResult, IAuthUser } from './interfaces/auth.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
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

  async register(data: { name: string; email: string; password: string; role?: string }): Promise<ILoginResult> {
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
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  private async buildLoginResult(user: { id: string; name: string; email: string; role: string }): Promise<ILoginResult> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }
}
