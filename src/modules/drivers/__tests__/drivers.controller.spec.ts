import { Test } from '@nestjs/testing';
import { AppException } from '../../../shared/filters/app-exception';
import { HttpStatus } from '@nestjs/common';
import { DriversController } from '../drivers.controller';
import { DriversService } from '../drivers.service';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

describe('DriversController', () => {
  let controller: DriversController;
  let service: jest.Mocked<DriversService>;

  const user: JwtPayload = { sub: 'user-1', email: 'a@a.com', name: 'Admin', role: 'admin', sv: 0 };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [DriversController],
      providers: [
        {
          provide: DriversService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            approve: jest.fn(),
            reject: jest.fn(),
            activate: jest.fn(),
            deactivate: jest.fn(),
            uploadDocument: jest.fn(),
            reviewDocument: jest.fn(),
            listTrips: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(DriversController);
    service = module.get(DriversService);
  });

  it('findAll forwards query params with defaults', async () => {
    service.findAll.mockResolvedValue({ items: [], meta: { page: 1, total: 0, limit: 20 } });

    await controller.findAll({});

    expect(service.findAll).toHaveBeenCalledWith({
      search: undefined,
      status: undefined,
      page: 1,
      limit: 20,
    });
  });

  it('findOne delegates to service.findById', async () => {
    service.findById.mockResolvedValue({ id: 'driver-1' } as never);

    const result = await controller.findOne('driver-1');

    expect(service.findById).toHaveBeenCalledWith('driver-1');
    expect(result).toEqual({ id: 'driver-1' });
  });

  it('create delegates to service.create', async () => {
    const dto = {
      nome: 'João',
      email: 'j@j.com',
      telefone: '119999',
      cnh: '123',
      veiculo: { placa: 'ABC1D23', modelo: 'Onix', ano: 2022 },
      endereco: { cep: '01310100', logradouro: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' },
    };
    service.create.mockResolvedValue({ id: 'driver-1' } as never);

    await controller.create(dto, user);

    expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
  });

  it('approve delegates to service.approve', async () => {
    service.approve.mockResolvedValue({ id: 'driver-1', status: 'ativo' } as never);

    const result = await controller.approve('driver-1');

    expect(service.approve).toHaveBeenCalledWith('driver-1');
    expect(result).toMatchObject({ status: 'ativo' });
  });

  it('reject delegates to service.reject with motivo', async () => {
    service.reject.mockResolvedValue({ id: 'driver-1', status: 'rejeitado' } as never);

    await controller.reject('driver-1', { motivo: 'x' });

    expect(service.reject).toHaveBeenCalledWith('driver-1', 'x');
  });

  it('uploadDocument throws FILE_REQUIRED when no file is provided', () => {
    expect(() => controller.uploadDocument('driver-1', 'cnh', undefined)).toThrow(AppException);
  });

  it('uploadDocument throws INVALID_DOCUMENT_TIPO for unknown tipo', () => {
    const file = {
      buffer: Buffer.from('x'),
      originalname: 'x.png',
      mimetype: 'image/png',
    } as Express.Multer.File;
    try {
      controller.uploadDocument('driver-1', 'invalido', file);
      fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AppException);
      expect((err as AppException).code).toBe('INVALID_DOCUMENT_TIPO');
      expect((err as AppException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
    }
  });

  it('uploadDocument delegates to service when file and tipo are valid', () => {
    const file = {
      buffer: Buffer.from('x'),
      originalname: 'x.png',
      mimetype: 'image/png',
    } as Express.Multer.File;
    service.uploadDocument.mockResolvedValue({ id: 'driver-1' } as never);

    controller.uploadDocument('driver-1', 'cnh', file);

    expect(service.uploadDocument).toHaveBeenCalledWith('driver-1', 'cnh', file);
  });

  it('reviewDocument delegates to service with current user id', async () => {
    service.reviewDocument.mockResolvedValue({ id: 'driver-1' } as never);

    await controller.reviewDocument('driver-1', 'cnh', { status: 'aprovado' }, user);

    expect(service.reviewDocument).toHaveBeenCalledWith(
      'driver-1',
      'cnh',
      'aprovado',
      'user-1',
      undefined,
    );
  });

  it('listTrips forwards pagination and date filters', async () => {
    service.listTrips.mockResolvedValue({ items: [], meta: { page: 1, total: 0, limit: 20 } });

    await controller.listTrips('driver-1', {});

    expect(service.listTrips).toHaveBeenCalledWith('driver-1', {
      page: 1,
      limit: 20,
      from: undefined,
      to: undefined,
    });
  });
});
