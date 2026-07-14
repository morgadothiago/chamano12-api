import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../shared/interfaces/paginated-result.interface';
import { IStorageProvider, STORAGE_PROVIDER } from '../../shared/storage/storage-provider.interface';
import { PassengersRepository } from './passengers.repository';

export type IPassenger = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  avatarUrl: string | null;
  status: string;
  saldoDevedor: number;
  totalCorridas: number;
  totalGasto: number;
  cadastroEm: string;
  ultimaCorrida: string | null;
  corridas: never[];
};

export type IPassengerAddress = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
};

export type IPassengerMe = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  avatarUrl: string | null;
  endereco: IPassengerAddress | null;
  cadastroCompleto: boolean;
};

type PassengerRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  saldoDevedor: string | null;
  enderecoCep: string | null;
  enderecoLogradouro: string | null;
  enderecoNumero: string | null;
  enderecoComplemento: string | null;
  enderecoBairro: string | null;
  enderecoCidade: string | null;
  enderecoUf: string | null;
  createdAt: Date;
};

function isCadastroCompleto(row: PassengerRow): boolean {
  return Boolean(
    row.enderecoCep &&
      row.enderecoLogradouro &&
      row.enderecoNumero &&
      row.enderecoBairro &&
      row.enderecoCidade &&
      row.enderecoUf,
  );
}

function mapEndereco(row: PassengerRow): IPassengerAddress | null {
  if (!isCadastroCompleto(row)) return null;
  return {
    cep: row.enderecoCep!,
    logradouro: row.enderecoLogradouro!,
    numero: row.enderecoNumero!,
    complemento: row.enderecoComplemento,
    bairro: row.enderecoBairro!,
    cidade: row.enderecoCidade!,
    uf: row.enderecoUf!,
  };
}

@Injectable()
export class PassengersService {
  constructor(
    private readonly passengersRepository: PassengersRepository,
    @Inject(STORAGE_PROVIDER) private readonly storageProvider: IStorageProvider,
  ) {}

  async findAll(params: { search?: string; page: number; limit: number }): Promise<PaginatedResult<IPassenger>> {
    const { rows, total } = await this.passengersRepository.findMany(params);

    const items = await Promise.all(
      rows.map(async (row) => {
        const metrics = await this.passengersRepository.getMetrics(row.id);
        return {
          id: row.id,
          nome: row.name,
          email: row.email,
          telefone: row.phone,
          avatarUrl: row.avatarUrl,
          status: row.status,
          saldoDevedor: Number(row.saldoDevedor ?? 0),
          totalCorridas: metrics.totalCorridas,
          totalGasto: metrics.totalGasto,
          cadastroEm: row.createdAt.toISOString(),
          ultimaCorrida: null,
          corridas: [],
        };
      }),
    );

    return { items, meta: { page: params.page, total, limit: params.limit } };
  }

  async findById(id: string): Promise<IPassenger> {
    const row = await this.passengersRepository.findById(id);
    if (!row) {
      throw new NotFoundException({ code: 'PASSENGER_NOT_FOUND', message: 'Passageiro não encontrado.' });
    }

    const metrics = await this.passengersRepository.getMetrics(id);

    return {
      id: row.id,
      nome: row.name,
      email: row.email,
      telefone: row.phone,
      avatarUrl: row.avatarUrl,
      status: row.status,
      saldoDevedor: Number(row.saldoDevedor ?? 0),
      totalCorridas: metrics.totalCorridas,
      totalGasto: metrics.totalGasto,
      cadastroEm: row.createdAt.toISOString(),
      ultimaCorrida: null,
      corridas: [],
    };
  }

  async update(
    id: string,
    data: { nome?: string; email?: string; telefone?: string },
  ): Promise<IPassenger> {
    const row = await this.passengersRepository.update(id, data);
    if (!row) {
      throw new NotFoundException({ code: 'PASSENGER_NOT_FOUND', message: 'Passageiro não encontrado.' });
    }
    return this.findById(id);
  }

  async block(id: string): Promise<IPassenger> {
    const row = await this.passengersRepository.setStatus(id, 'bloqueado');
    if (!row) {
      throw new NotFoundException({ code: 'PASSENGER_NOT_FOUND', message: 'Passageiro não encontrado.' });
    }
    return this.findById(id);
  }

  async unblock(id: string): Promise<IPassenger> {
    const row = await this.passengersRepository.setStatus(id, 'ativo');
    if (!row) {
      throw new NotFoundException({ code: 'PASSENGER_NOT_FOUND', message: 'Passageiro não encontrado.' });
    }
    return this.findById(id);
  }

  async remove(id: string): Promise<IPassenger> {
    const row = await this.passengersRepository.setStatus(id, 'excluido');
    if (!row) {
      throw new NotFoundException({ code: 'PASSENGER_NOT_FOUND', message: 'Passageiro não encontrado.' });
    }
    return this.findById(id);
  }

  async findMe(userId: string): Promise<IPassengerMe> {
    const row = await this.passengersRepository.findById(userId);
    if (!row) {
      throw new NotFoundException({ code: 'PASSENGER_NOT_FOUND', message: 'Passageiro não encontrado.' });
    }

    return {
      id: row.id,
      nome: row.name,
      email: row.email,
      telefone: row.phone,
      avatarUrl: row.avatarUrl,
      endereco: mapEndereco(row),
      cadastroCompleto: isCadastroCompleto(row),
    };
  }

  async updateMe(
    userId: string,
    data: {
      cep: string;
      logradouro: string;
      numero: string;
      complemento?: string;
      bairro: string;
      cidade: string;
      uf: string;
    },
  ): Promise<IPassengerMe> {
    await this.passengersRepository.updateProfile(userId, data);
    return this.findMe(userId);
  }

  async updateAvatar(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
  ): Promise<IPassengerMe> {
    const stored = await this.storageProvider.save({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      folder: `passengers/${userId}`,
    });

    await this.passengersRepository.updateAvatar(userId, stored.url);
    return this.findMe(userId);
  }
}
