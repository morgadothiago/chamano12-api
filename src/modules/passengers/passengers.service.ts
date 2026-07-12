import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../shared/interfaces/paginated-result.interface';
import { PassengersRepository } from './passengers.repository';

export type IPassenger = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  status: 'ativo';
  totalCorridas: number;
  totalGasto: number;
  cadastroEm: string;
  ultimaCorrida: string | null;
  corridas: never[];
};

@Injectable()
export class PassengersService {
  constructor(private readonly passengersRepository: PassengersRepository) {}

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
          status: 'ativo' as const,
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
      status: 'ativo',
      totalCorridas: metrics.totalCorridas,
      totalGasto: metrics.totalGasto,
      cadastroEm: row.createdAt.toISOString(),
      ultimaCorrida: null,
      corridas: [],
    };
  }
}
