import { Test } from '@nestjs/testing';
import { STORAGE_PROVIDER } from '../../../shared/storage/storage-provider.interface';
import { DriversService } from '../drivers.service';
import { DriversRepository } from '../drivers.repository';
import { DriverRow } from '../../../database/schema';

function makeDriverRow(overrides: Partial<DriverRow> = {}): DriverRow {
  return {
    id: 'driver-1',
    userId: null,
    nome: 'João',
    email: 'joao@example.com',
    telefone: '11999998888',
    cnh: '12345678900',
    status: 'pendente',
    avatarUrl: null,
    veiculoPlaca: 'ABC1D23',
    veiculoModelo: 'Onix',
    veiculoAno: 2022,
    enderecoCep: '01310100',
    enderecoLogradouro: 'Av. Paulista',
    enderecoNumero: '1000',
    enderecoComplemento: null,
    enderecoBairro: 'Bela Vista',
    enderecoCidade: 'São Paulo',
    enderecoUf: 'SP',
    localizacaoLat: null,
    localizacaoLng: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeDocuments(status: 'aprovado' | 'pendente' = 'pendente') {
  return (['cnh', 'crlv', 'foto_veiculo'] as const).map((tipo) => ({
    id: `doc-${tipo}`,
    driverId: 'driver-1',
    tipo,
    status,
    enviadoEm: new Date('2026-01-01'),
    arquivoUrl: null,
    revisadoPor: null,
    motivoRejeicao: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  }));
}

describe('DriversService', () => {
  let service: DriversService;
  let repo: jest.Mocked<DriversRepository>;
  let storage: { save: jest.Mock };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DriversService,
        {
          provide: DriversRepository,
          useValue: {
            findMany: jest.fn(),
            findById: jest.fn(),
            findByEmail: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateStatus: jest.fn(),
            findDocuments: jest.fn(),
            findDocument: jest.fn(),
            upsertDocumentUpload: jest.fn(),
            reviewDocument: jest.fn(),
            getMetrics: jest.fn(),
            findTrips: jest.fn(),
          },
        },
        { provide: STORAGE_PROVIDER, useValue: { save: jest.fn() } },
      ],
    }).compile();

    service = module.get(DriversService);
    repo = module.get(DriversRepository);
    storage = module.get(STORAGE_PROVIDER);

    repo.getMetrics.mockResolvedValue({ corridas: 0, avaliacaoMedia: 0, ganhos: 0 });
    repo.findDocuments.mockResolvedValue(makeDocuments());
  });

  describe('findAll', () => {
    it('returns paginated drivers with metrics and documents', async () => {
      repo.findMany.mockResolvedValue({ rows: [makeDriverRow()], total: 1 });

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, total: 1, limit: 20 });
    });
  });

  describe('findById', () => {
    it('returns mapped driver when found', async () => {
      repo.findById.mockResolvedValue(makeDriverRow());

      const result = await service.findById('driver-1');

      expect(result.id).toBe('driver-1');
      expect(result.documentos).toHaveLength(3);
    });

    it('throws DRIVER_NOT_FOUND when driver does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toMatchObject({
        code: 'DRIVER_NOT_FOUND',
      });
    });
  });

  describe('create', () => {
    const dto = {
      nome: 'João',
      email: 'joao@example.com',
      telefone: '11999998888',
      cnh: '12345678900',
      veiculo: { placa: 'ABC1D23', modelo: 'Onix', ano: 2022 },
      endereco: { cep: '01310100', logradouro: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' },
    };

    it('creates driver pendente with zeroed metrics', async () => {
      repo.findByEmail.mockResolvedValue(null);
      repo.create.mockResolvedValue(makeDriverRow());

      const result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith(dto, undefined);
      expect(result.status).toBe('pendente');
      expect(result.metrics).toEqual({ corridas: 0, avaliacaoMedia: 0, ganhos: 0 });
    });

    it('rejects duplicate email', async () => {
      repo.findByEmail.mockResolvedValue(makeDriverRow());

      await expect(service.create(dto)).rejects.toMatchObject({
        code: 'DRIVER_EMAIL_ALREADY_EXISTS',
      });
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates cadastral data and returns the mapped driver', async () => {
      repo.findById.mockResolvedValue(makeDriverRow());
      repo.update.mockResolvedValue(makeDriverRow({ nome: 'Novo Nome' }));

      const result = await service.update('driver-1', { nome: 'Novo Nome' });

      expect(repo.update).toHaveBeenCalledWith('driver-1', { nome: 'Novo Nome' });
      expect(result.nome).toBe('Novo Nome');
    });

    it('throws DRIVER_NOT_FOUND when driver does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.update('missing', { nome: 'X' })).rejects.toMatchObject({
        code: 'DRIVER_NOT_FOUND',
      });
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('approve', () => {
    it('approves when all 3 documents are aprovado', async () => {
      repo.findById.mockResolvedValue(makeDriverRow({ status: 'pendente' }));
      repo.findDocuments.mockResolvedValue(makeDocuments('aprovado'));
      repo.updateStatus.mockResolvedValue(makeDriverRow({ status: 'ativo' }));

      const result = await service.approve('driver-1');

      expect(repo.updateStatus).toHaveBeenCalledWith('driver-1', 'ativo');
      expect(result.status).toBe('ativo');
    });

    it('rejects with DOCUMENTS_NOT_APPROVED when documents are pending', async () => {
      repo.findById.mockResolvedValue(makeDriverRow({ status: 'pendente' }));
      repo.findDocuments.mockResolvedValue(makeDocuments('pendente'));

      await expect(service.approve('driver-1')).rejects.toMatchObject({
        code: 'DOCUMENTS_NOT_APPROVED',
      });
      expect(repo.updateStatus).not.toHaveBeenCalled();
    });

    it('rejects when driver is not pendente', async () => {
      repo.findById.mockResolvedValue(makeDriverRow({ status: 'ativo' }));
      repo.findDocuments.mockResolvedValue(makeDocuments('aprovado'));

      await expect(service.approve('driver-1')).rejects.toMatchObject({
        code: 'DRIVER_NOT_PENDING',
      });
    });
  });

  describe('reject', () => {
    it('soft-deletes by setting status rejeitado, never removes the row', async () => {
      repo.findById.mockResolvedValue(makeDriverRow({ status: 'pendente' }));
      repo.updateStatus.mockResolvedValue(makeDriverRow({ status: 'rejeitado' }));

      const result = await service.reject('driver-1', 'motivo x');

      expect(repo.updateStatus).toHaveBeenCalledWith('driver-1', 'rejeitado');
      expect(result.status).toBe('rejeitado');
    });

    it('throws DRIVER_NOT_FOUND for unknown driver', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.reject('missing')).rejects.toMatchObject({
        code: 'DRIVER_NOT_FOUND',
      });
    });
  });

  describe('activate / deactivate', () => {
    it('activates an inativo driver', async () => {
      repo.findById.mockResolvedValue(makeDriverRow({ status: 'inativo' }));
      repo.updateStatus.mockResolvedValue(makeDriverRow({ status: 'ativo' }));

      const result = await service.activate('driver-1');

      expect(result.status).toBe('ativo');
    });

    it('refuses to activate a pendente driver', async () => {
      repo.findById.mockResolvedValue(makeDriverRow({ status: 'pendente' }));

      await expect(service.activate('driver-1')).rejects.toMatchObject({
        code: 'INVALID_STATUS_TRANSITION',
      });
    });

    it('deactivates an ativo driver', async () => {
      repo.findById.mockResolvedValue(makeDriverRow({ status: 'ativo' }));
      repo.updateStatus.mockResolvedValue(makeDriverRow({ status: 'inativo' }));

      const result = await service.deactivate('driver-1');

      expect(result.status).toBe('inativo');
    });

    it('refuses to deactivate a rejeitado driver', async () => {
      repo.findById.mockResolvedValue(makeDriverRow({ status: 'rejeitado' }));

      await expect(service.deactivate('driver-1')).rejects.toMatchObject({
        code: 'INVALID_STATUS_TRANSITION',
      });
    });
  });

  describe('uploadDocument', () => {
    it('stores the file and sets document status back to pendente', async () => {
      repo.findById.mockResolvedValue(makeDriverRow());
      storage.save.mockResolvedValue({ url: '/uploads/drivers/driver-1/cnh.png', key: 'x' });
      repo.upsertDocumentUpload.mockResolvedValue({} as never);

      await service.uploadDocument('driver-1', 'cnh', {
        buffer: Buffer.from('x'),
        originalname: 'cnh.png',
        mimetype: 'image/png',
      });

      expect(storage.save).toHaveBeenCalledWith(
        expect.objectContaining({ folder: 'drivers/driver-1' }),
      );
      expect(repo.upsertDocumentUpload).toHaveBeenCalledWith(
        'driver-1',
        'cnh',
        '/uploads/drivers/driver-1/cnh.png',
      );
    });

    it('throws DRIVER_NOT_FOUND for unknown driver', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.uploadDocument('missing', 'cnh', {
          buffer: Buffer.from('x'),
          originalname: 'x.png',
          mimetype: 'image/png',
        }),
      ).rejects.toMatchObject({ code: 'DRIVER_NOT_FOUND' });
    });
  });

  describe('reviewDocument', () => {
    it('approves a document', async () => {
      repo.findById.mockResolvedValue(makeDriverRow());
      repo.findDocument.mockResolvedValue(makeDocuments()[0] as never);
      repo.reviewDocument.mockResolvedValue({} as never);

      await service.reviewDocument('driver-1', 'cnh', 'aprovado', 'user-1');

      expect(repo.reviewDocument).toHaveBeenCalledWith(
        'driver-1',
        'cnh',
        'aprovado',
        'user-1',
        undefined,
      );
    });

    it('throws DOCUMENT_NOT_FOUND when document type does not exist for driver', async () => {
      repo.findById.mockResolvedValue(makeDriverRow());
      repo.findDocument.mockResolvedValue(null);

      await expect(
        service.reviewDocument('driver-1', 'cnh', 'rejeitado', 'user-1'),
      ).rejects.toMatchObject({ code: 'DOCUMENT_NOT_FOUND' });
    });
  });

  describe('listTrips', () => {
    it('returns paginated empty list (rides module is a stub in this phase)', async () => {
      repo.findById.mockResolvedValue(makeDriverRow());
      repo.findTrips.mockResolvedValue({ rows: [], total: 0 });

      const result = await service.listTrips('driver-1', { page: 1, limit: 20 });

      expect(result.items).toEqual([]);
      expect(result.meta).toEqual({ page: 1, total: 0, limit: 20 });
    });

    it('throws DRIVER_NOT_FOUND for unknown driver', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.listTrips('missing', { page: 1, limit: 20 })).rejects.toMatchObject({
        code: 'DRIVER_NOT_FOUND',
      });
    });
  });
});
