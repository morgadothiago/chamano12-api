import { Module, forwardRef } from '@nestjs/common';
import { RidesController } from './rides.controller';
import { RidesService } from './rides.service';
import { RidesRepository } from './rides.repository';
import { DriversModule } from '../drivers/drivers.module';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [DriversModule, forwardRef(() => WsModule)],
  controllers: [RidesController],
  providers: [RidesService, RidesRepository],
  exports: [RidesService, RidesRepository],
})
export class RidesModule {}
