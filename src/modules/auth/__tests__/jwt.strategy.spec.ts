import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

describe('JwtStrategy', () => {
  it('validate returns the decoded payload unchanged', () => {
    const config = { get: jest.fn().mockReturnValue('test-secret') } as unknown as ConfigService;
    const strategy = new JwtStrategy(config);

    const payload: JwtPayload = { sub: 'user-1', email: 'a@a.com', name: 'Admin', role: 'admin' };

    expect(strategy.validate(payload)).toEqual(payload);
  });

  it('falls back to a dev secret when JWT_SECRET is not configured', () => {
    const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;

    expect(() => new JwtStrategy(config)).not.toThrow();
  });
});
