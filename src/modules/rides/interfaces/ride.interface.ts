export type RideStatus = 'solicitada' | 'aceita' | 'iniciada' | 'finalizada' | 'cancelada';
export type RideCanceladoPor = 'motorista' | 'passageiro' | 'sistema';
export type RideFormaPagamento = 'dinheiro' | 'cartao' | 'pix';

export interface ICreateRide {
  passengerId: string;
  passengerName: string;
  passengerPhone?: string;
  origem: string;
  origemLat: number;
  origemLng: number;
  destino: string;
  destinoLat: number;
  destinoLng: number;
  distanciaKm?: number;
  valor?: number;
  formaPagamento?: RideFormaPagamento;
}

export interface IAcceptRide {
  driverId: string;
}

export interface IRide {
  id: string;
  driverId: string | null;
  passengerId: string | null;
  passengerName: string;
  passengerPhone: string | null;
  passengerAvatarUrl: string | null;
  origem: string;
  origemLat: number;
  origemLng: number;
  destino: string;
  destinoLat: number;
  destinoLng: number;
  status: RideStatus;
  valor: number | null;
  distanciaKm: number | null;
  formaPagamento: RideFormaPagamento | null;
  avaliacao: number | null;
  solicitadaEm: string;
  aceitaEm: string | null;
  iniciadaEm: string | null;
  finalizadaEm: string | null;
  canceladaEm: string | null;
  canceladoPor: RideCanceladoPor | null;
  motivoCancelamento: string | null;
}

export interface IDriverLocation {
  driverId: string;
  driverName: string;
  vehicle: string;
  lat: number;
  lng: number;
  status: 'available' | 'busy';
}

export interface INearbyDriver {
  driverId: string;
  driverName: string;
  vehicle: string;
  lat: number;
  lng: number;
  distanciaKm: number;
}

export interface IRideRequestNotification {
  rideId: string;
  passengerName: string;
  origem: string;
  origemLat: number;
  origemLng: number;
  destino: string;
  destinoLat: number;
  destinoLng: number;
  distanciaKm: number;
  valor: number;
  formaPagamento: RideFormaPagamento;
}
