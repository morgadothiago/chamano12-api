import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: { login: jest.fn(), me: jest.fn() } }],
    })
      // forgot-password/reset-password usam @UseGuards(ThrottlerGuard); em
      // produção o ThrottlerModule.forRoot() é registrado no AuthModule, mas
      // esse teste monta só o controller isoladamente, então a instanciação
      // real do guard falharia por falta de ThrottlerStorage/opções.
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AuthController);
    authService = module.get(AuthService);
  });

  it('login delegates to AuthService.login', async () => {
    authService.login.mockResolvedValue({
      token: 'jwt',
      user: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'admin', phone: null },
    });

    const result = await controller.login({ email: 'admin@example.com', password: 'admin123' });

    expect(authService.login).toHaveBeenCalledWith('admin@example.com', 'admin123', undefined);
    expect(result.token).toBe('jwt');
  });

  it('logout returns loggedOut true without touching AuthService', () => {
    expect(controller.logout()).toEqual({ loggedOut: true });
  });

  it('me delegates to AuthService.me with the authenticated user id', async () => {
    const payload: JwtPayload = { sub: 'user-1', email: 'a@a.com', name: 'Admin', role: 'admin', sv: 0 };
    authService.me.mockResolvedValue({
      id: 'user-1',
      name: 'Admin',
      email: 'a@a.com',
      role: 'admin',
      phone: null,
    });

    const result = await controller.me(payload);

    expect(authService.me).toHaveBeenCalledWith('user-1');
    expect(result.id).toBe('user-1');
  });
});
