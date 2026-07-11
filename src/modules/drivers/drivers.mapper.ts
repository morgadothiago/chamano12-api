import { DriverDocumentRow, DriverRow } from '../../database/schema';
import { IDriver, IDriverDocument, IDriverMetrics } from './interfaces/driver.interface';

export function mapDocumentRow(row: DriverDocumentRow): IDriverDocument {
  return {
    tipo: row.tipo,
    status: row.status,
    enviadoEm: row.enviadoEm.toISOString(),
    arquivoUrl: row.arquivoUrl ?? null,
    revisadoPor: row.revisadoPor ?? undefined,
    motivoRejeicao: row.motivoRejeicao ?? undefined,
  };
}

export function mapDriverRow(
  row: DriverRow,
  documentos: DriverDocumentRow[],
  metrics: IDriverMetrics,
): IDriver {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    telefone: row.telefone,
    cnh: row.cnh,
    status: row.status,
    avatarUrl: row.avatarUrl ?? null,
    veiculo: {
      placa: row.veiculoPlaca,
      modelo: row.veiculoModelo,
      ano: row.veiculoAno,
    },
    endereco: {
      cep: row.enderecoCep,
      logradouro: row.enderecoLogradouro,
      numero: row.enderecoNumero,
      complemento: row.enderecoComplemento ?? undefined,
      bairro: row.enderecoBairro,
      cidade: row.enderecoCidade,
      uf: row.enderecoUf,
    },
    metrics,
    documentos: documentos.map(mapDocumentRow),
    localizacaoAtual:
      row.localizacaoLat !== null && row.localizacaoLng !== null
        ? { lat: Number(row.localizacaoLat), lng: Number(row.localizacaoLng) }
        : null,
  };
}
