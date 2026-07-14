import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CouponsRepository, ICreateCoupon, IUpdateCoupon } from './coupons.repository';

export type ICoupon = {
  id: string;
  codigo: string;
  tipoDesconto: 'percentual' | 'fixo';
  valor: number;
  ativo: boolean;
  createdAt: string;
};

function mapCoupon(row: {
  id: string;
  codigo: string;
  tipoDesconto: string;
  valor: string;
  ativo: boolean;
  createdAt: Date;
}): ICoupon {
  return {
    id: row.id,
    codigo: row.codigo,
    tipoDesconto: row.tipoDesconto as 'percentual' | 'fixo',
    valor: Number(row.valor),
    ativo: row.ativo,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class CouponsService {
  constructor(private readonly couponsRepository: CouponsRepository) {}

  async findAll(): Promise<ICoupon[]> {
    const rows = await this.couponsRepository.findAll();
    return rows.map(mapCoupon);
  }

  async create(data: ICreateCoupon): Promise<ICoupon> {
    const existing = await this.couponsRepository.findByCodigo(data.codigo);
    if (existing) {
      throw new ConflictException({
        code: 'COUPON_CODE_ALREADY_EXISTS',
        message: 'Já existe um cupom com este código.',
      });
    }

    const row = await this.couponsRepository.create(data);
    return mapCoupon(row);
  }

  async update(id: string, data: IUpdateCoupon): Promise<ICoupon> {
    const row = await this.couponsRepository.update(id, data);
    if (!row) {
      throw new NotFoundException({ code: 'COUPON_NOT_FOUND', message: 'Cupom não encontrado.' });
    }
    return mapCoupon(row);
  }
}
