import { Injectable } from '@nestjs/common';

export interface IDriverLocation {
  driverId: string;
  driverName: string;
  vehicle: string;
  lat: number;
  lng: number;
  status: 'available' | 'busy';
}

export interface INearbyDriver extends IDriverLocation {
  distanciaKm: number;
}

const EARTH_RADIUS_KM = 6371;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class DriverLocationStore {
  private readonly drivers = new Map<string, IDriverLocation>();

  set(driverId: string, location: IDriverLocation): void {
    this.drivers.set(driverId, location);
  }

  get(driverId: string): IDriverLocation | undefined {
    return this.drivers.get(driverId);
  }

  delete(driverId: string): boolean {
    return this.drivers.delete(driverId);
  }

  getAll(): IDriverLocation[] {
    return Array.from(this.drivers.values());
  }

  findNearby(lat: number, lng: number, radiusKm: number = 5): INearbyDriver[] {
    const result: INearbyDriver[] = [];
    for (const [, driver] of this.drivers) {
      if (driver.status !== 'available') continue;
      const distanciaKm = Math.round(haversineDistance(lat, lng, driver.lat, driver.lng) * 100) / 100;
      if (distanciaKm <= radiusKm) {
        result.push({ ...driver, distanciaKm });
      }
    }
    return result.sort((a, b) => a.distanciaKm - b.distanciaKm);
  }

  get size(): number {
    return this.drivers.size;
  }
}
