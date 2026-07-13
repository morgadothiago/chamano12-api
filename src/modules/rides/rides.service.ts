import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../shared/filters/app-exception';
import { PaginatedResult } from '../../shared/interfaces/paginated-result.interface';
import { RidesRepository } from './rides.repository';
import {
  ICreateRide,
  IRide,
  RideCanceladoPor,
  RideFormaPagamento,
} from './interfaces/ride.interface';

function mapRideRow(row: {
  id: string;
  driverId: string | null;
  passengerId: string | null;
  passengerName: string;
  passengerPhone: string | null;
  origem: string;
  origemLat: string | null;
  origemLng: string | null;
  destino: string;
  destinoLat: string | null;
  destinoLng: string | null;
  status: string;
  valor: string | null;
  distanciaKm: string | null;
  formaPagamento: string | null;
  avaliacao: number | null;
  solicitadaEm: Date;
  aceitaEm: Date | null;
  iniciadaEm: Date | null;
  finalizadaEm: Date | null;
  canceladaEm: Date | null;
  canceladoPor: string | null;
  motivoCancelamento: string | null;
}): IRide {
  return {
    id: row.id,
    driverId: row.driverId,
    passengerId: row.passengerId,
    passengerName: row.passengerName,
    passengerPhone: row.passengerPhone,
    origem: row.origem,
    origemLat: Number(row.origemLat),
    origemLng: Number(row.origemLng),
    destino: row.destino,
    destinoLat: Number(row.destinoLat),
    destinoLng: Number(row.destinoLng),
    status: row.status as IRide['status'],
    valor: row.valor ? Number(row.valor) : null,
    distanciaKm: row.distanciaKm ? Number(row.distanciaKm) : null,
    formaPagamento: row.formaPagamento as RideFormaPagamento | null,
    avaliacao: row.avaliacao,
    solicitadaEm: row.solicitadaEm.toISOString(),
    aceitaEm: row.aceitaEm?.toISOString() ?? null,
    iniciadaEm: row.iniciadaEm?.toISOString() ?? null,
    finalizadaEm: row.finalizadaEm?.toISOString() ?? null,
    canceladaEm: row.canceladaEm?.toISOString() ?? null,
    canceladoPor: row.canceladoPor as RideCanceladoPor | null,
    motivoCancelamento: row.motivoCancelamento,
  };
}

@Injectable()
export class RidesService {
  constructor(private readonly ridesRepository: RidesRepository) {}

  async findById(id: string): Promise<IRide> {
    const row = await this.ridesRepository.findById(id);
    if (!row) throw this.notFound();
    return mapRideRow(row);
  }

  async createRideRequest(data: ICreateRide): Promise<IRide> {
    const existing = await this.ridesRepository.findPendingByPassenger(
      data.passengerId,
    );
    if (existing) {
      throw new AppException(
        'PASSENGER_HAS_PENDING_RIDE',
        'Você já possui uma corrida em andamento.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const row = await this.ridesRepository.createRideRequest(data);
    return mapRideRow(row);
  }

  async acceptRide(id: string, driverId: string): Promise<IRide> {
    const row = await this.ridesRepository.acceptRide(id, driverId);
    if (!row) {
      throw new AppException(
        'RIDE_NOT_ACCEPTABLE',
        'Corrida não está mais disponível para aceite.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return mapRideRow(row);
  }

  async startRide(id: string): Promise<IRide> {
    const row = await this.ridesRepository.startRide(id);
    if (!row) {
      throw new AppException(
        'RIDE_NOT_STARTABLE',
        'Corrida não pode ser iniciada. Status atual não é "aceita".',
        HttpStatus.BAD_REQUEST,
      );
    }
    return mapRideRow(row);
  }

  async completeRide(id: string): Promise<IRide> {
    const row = await this.ridesRepository.completeRide(id);
    if (!row) {
      throw new AppException(
        'RIDE_NOT_COMPLETABLE',
        'Corrida não pode ser finalizada. Status atual não é "iniciada".',
        HttpStatus.BAD_REQUEST,
      );
    }
    return mapRideRow(row);
  }

  async cancelRide(
    id: string,
    canceladoPor: RideCanceladoPor,
    motivo?: string,
  ): Promise<IRide> {
    const row = await this.ridesRepository.cancelRide(id, canceladoPor, motivo);
    if (!row) {
      throw new AppException(
        'RIDE_NOT_CANCELLABLE',
        'Corrida não pode ser cancelada ou já foi finalizada.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return mapRideRow(row);
  }

  async listRides(params: {
    status?: string;
    driverId?: string;
    passengerId?: string;
    page: number;
    limit: number;
  }): Promise<PaginatedResult<IRide>> {
    const { rows, total } = await this.ridesRepository.findMany(params);
    return {
      items: rows.map(mapRideRow),
      meta: { page: params.page, total, limit: params.limit },
    };
  }

  private notFound(): AppException {
    return new AppException('RIDE_NOT_FOUND', 'Corrida não encontrada.', HttpStatus.NOT_FOUND);
  }
}
