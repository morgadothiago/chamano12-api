import { Module } from '@nestjs/common';
import { RidesController } from './rides.controller';
import { RidesService } from './rides.service';
import { RidesRepository } from './rides.repository';

@Module({
  controllers: [RidesController],
  providers: [RidesService, RidesRepository],
  exports: [RidesService, RidesRepository],
})
export class RidesModule {}
