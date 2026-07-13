import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { UsersRepository } from '../users.repository';

describe('JwtStrategy', () => {
  it('validate returns the decoded payload when sessionVersion matches', async () => {
    const config = { get: jest.fn().mockReturnValue('test-secret') } as unknown as ConfigService;
    const usersRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'user-1', sessionVersion: 0 }),
    } as unknown as UsersRepository;
    const strategy = new JwtStrategy(config, usersRepository);

    const payload: JwtPayload = { sub: 'user-1', email: 'a@a.com', name: 'Admin', role: 'admin', sv: 0 };

    await expect(strategy.validate(payload)).resolves.toEqual(payload);
  });

  it('rejects when sessionVersion no longer matches (logged in elsewhere)', async () => {
    const config = { get: jest.fn().mockReturnValue('test-secret') } as unknown as ConfigService;
    const usersRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'user-1', sessionVersion: 2 }),
    } as unknown as UsersRepository;
    const strategy = new JwtStrategy(config, usersRepository);

    const payload: JwtPayload = { sub: 'user-1', email: 'a@a.com', name: 'Admin', role: 'admin', sv: 0 };

    await expect(strategy.validate(payload)).rejects.toThrow();
  });

  it('falls back to a dev secret when JWT_SECRET is not configured', () => {
    const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
    const usersRepository = { findById: jest.fn() } as unknown as UsersRepository;

    expect(() => new JwtStrategy(config, usersRepository)).not.toThrow();
  });
});
