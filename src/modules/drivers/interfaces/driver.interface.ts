export type DriverStatus = 'ativo' | 'inativo' | 'pendente' | 'rejeitado';
export type DocumentTipo = 'cnh' | 'crlv' | 'foto_veiculo';
export type DocumentStatus = 'aprovado' | 'pendente' | 'rejeitado';

export interface IVehicle {
  placa: string;
  modelo: string;
  ano: number;
}

export interface IAddress {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface IDriverMetrics {
  corridas: number;
  avaliacaoMedia: number;
  ganhos: number;
}

export interface ILatLng {
  lat: number;
  lng: number;
}

export interface IDriverDocument {
  tipo: DocumentTipo;
  status: DocumentStatus;
  enviadoEm: string;
  arquivoUrl: string | null;
  revisadoPor?: string;
  motivoRejeicao?: string;
}

export interface IDriverTrip {
  id: string;
  data: string;
  origem: string;
  destino: string;
  valor: number;
  avaliacao: number;
}

export interface IDriverRating {
  id: string;
  avaliacao: number;
  avaliacaoTags: string[];
  origem: string;
  destino: string;
  valor: number;
  finalizadaEm: string | null;
  passengerName: string;
}

/**
 * Driver completo (GET /drivers/:id). `corridas` NÃO vem embutido aqui — é
 * lido separadamente via GET /drivers/:id/trips (ver spec seção 7).
 */
export interface IDriver {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cnh: string;
  status: DriverStatus;
  avatarUrl: string | null;
  veiculo: IVehicle;
  endereco: IAddress;
  metrics: IDriverMetrics;
  documentos: IDriverDocument[];
  localizacaoAtual: ILatLng | null;
}

export interface ICreateDriver {
  nome: string;
  email: string;
  telefone: string;
  cnh: string;
  veiculo: IVehicle;
  endereco: IAddress;
}

export type IUpdateDriver = Partial<ICreateDriver>;

export interface IDriverListFilters {
  search?: string;
  status?: DriverStatus;
  page: number;
  limit: number;
}
