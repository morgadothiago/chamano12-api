import { Injectable } from '@nestjs/common';
import { PricingRepository } from './pricing.repository';
import { PricingResponseDto } from './dto/pricing-response.dto';
import { UpdatePricingDto } from './dto/update-pricing.dto';

@Injectable()
export class PricingService {
  constructor(private readonly pricingRepository: PricingRepository) {}

  async get(): Promise<PricingResponseDto> {
    const row = await this.pricingRepository.getOrCreate();
    return this.toDto(row);
  }

  async update(data: UpdatePricingDto): Promise<PricingResponseDto> {
    const row = await this.pricingRepository.update(data);
    return this.toDto(row);
  }

  private toDto(row: {
    taxaBase: string;
    valorPorKm: string;
    valorPorMinuto: string;
    valorMinimo: string;
    updatedAt: Date;
  }): PricingResponseDto {
    return {
      taxaBase: Number(row.taxaBase),
      valorPorKm: Number(row.valorPorKm),
      valorPorMinuto: Number(row.valorPorMinuto),
      valorMinimo: Number(row.valorMinimo),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
