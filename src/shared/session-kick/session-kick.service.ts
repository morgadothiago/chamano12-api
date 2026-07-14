import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

/**
 * Ponte desacoplada entre AuthModule (onde a sessão é invalidada no login)
 * e WsModule (onde o socket antigo precisa ser derrubado na hora) — evita
 * dependência circular entre os dois módulos (WsModule já importa
 * AuthModule pro JwtStrategy/UsersRepository).
 */
@Injectable()
export class SessionKickService {
  private readonly emitter = new EventEmitter();

  notifyNewSession(userId: string): void {
    this.emitter.emit('kick', userId);
  }

  onKick(listener: (userId: string) => void): void {
    this.emitter.on('kick', listener);
  }
}
