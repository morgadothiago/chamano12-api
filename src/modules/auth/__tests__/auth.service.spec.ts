import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
import { UsersRepository, IUserRecord } from '../users.repository';

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
  };

  beforeEach(async () => {
    fakeUser.passwordHash = await bcrypt.hash('admin123', 4);

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersRepository,
          useValue: { findByEmail: jest.fn(), findById: jest.fn() },
        },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
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
      });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin',
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
      });
    });

    it('throws when user id is not found', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.me('missing')).rejects.toThrow(UnauthorizedException);
    });
  });
});
