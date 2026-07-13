import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { UsersRepository } from '../users.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersRepository: UsersRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'dev-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.usersRepository.findById(payload.sub);
    if (!user || user.sessionVersion !== payload.sv) {
      // Sessão vigente é de um login mais recente (outro aparelho) — só
      // 1 sessão ativa por conta é permitida.
      throw new UnauthorizedException({
        code: 'SESSION_EXPIRED',
        message: 'Sua sessão expirou porque a conta foi acessada em outro aparelho.',
      });
    }
    return payload;
  }
}
