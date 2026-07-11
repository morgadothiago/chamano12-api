import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard padrão para todas as rotas do painel interno. Valida o Bearer token
 * JWT emitido por POST /api/v1/auth/login.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
