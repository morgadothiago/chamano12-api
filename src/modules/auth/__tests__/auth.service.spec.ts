import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
import { UsersRepository, IUserRecord } from '../users.repository';
import { PasswordResetRepository } from '../password-reset.repository';
import { MailService } from '../../../shared/mail/mail.service';
import { DriversRepository } from '../../drivers/drivers.repository';
import { SessionKickService } from '../../../shared/session-kick/session-kick.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: jest.Mocked<UsersRepository>;
  let jwtService: jest.Mocked<JwtService>;

  const fakeUser: IUserRecord = {
    id: 'user-1',
    name: 'Admin',
    email: 'admin@example.com',
    passwordHash: '',
    role: 'admin',
    phone: null,
    sessionVersion: 0,
    status: 'ativo',
    saldoDevedor: '0',
  };

  beforeEach(async () => {
    fakeUser.passwordHash = await bcrypt.hash('admin123', 4);

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersRepository,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            incrementSessionVersion: jest.fn().mockResolvedValue(1),
          },
        },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        {
          provide: PasswordResetRepository,
          useValue: { create: jest.fn(), findLatestActive: jest.fn(), incrementAttempts: jest.fn(), markConsumed: jest.fn() },
        },
        { provide: MailService, useValue: { sendPasswordResetCode: jest.fn() } },
        { provide: DriversRepository, useValue: { findByUserId: jest.fn() } },
        { provide: SessionKickService, useValue: { notifyNewSession: jest.fn(), onKick: jest.fn() } },
      ],
    }).compile();

    service = module.get(AuthService);
    usersRepository = module.get(UsersRepository);
    jwtService = module.get(JwtService);
  });

  describe('login', () => {
    it('returns token and user for valid credentials', async () => {
      usersRepository.findByEmail.mockResolvedValue(fakeUser);
      jwtService.signAsync.mockResolvedValue('signed-jwt-token');

      const result = await service.login('admin@example.com', 'admin123');

      expect(result.token).toBe('signed-jwt-token');
      expect(result.user).toEqual({
        id: 'user-1',
        name: 'Admin',
        email: 'admin@example.com',
        role: 'admin',
        phone: null,
      });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin',
        sv: 1,
      });
    });

    it('rejects when user does not exist', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);

      await expect(service.login('nope@example.com', 'x')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when password does not match', async () => {
      usersRepository.findByEmail.mockResolvedValue(fakeUser);

      await expect(service.login('admin@example.com', 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('me', () => {
    it('returns current user data', async () => {
      usersRepository.findById.mockResolvedValue(fakeUser);

      const result = await service.me('user-1');

      expect(result).toEqual({
        id: 'user-1',
        name: 'Admin',
        email: 'admin@example.com',
        role: 'admin',
        phone: null,
      });
    });

    it('throws when user id is not found', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.me('missing')).rejects.toThrow(UnauthorizedException);
    });
  });
});
