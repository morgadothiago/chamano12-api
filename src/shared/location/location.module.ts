import { Module, Global } from '@nestjs/common';
import { DriverLocationStore } from './driver-location.store';

@Global()
@Module({
  providers: [DriverLocationStore],
  exports: [DriverLocationStore],
})
export class LocationModule {}
