import { Module } from '@nestjs/common';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { DriversRepository } from './drivers.repository';
import { StorageModule } from '../../shared/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [DriversController],
  providers: [DriversService, DriversRepository],
  exports: [DriversService, DriversRepository],
})
export class DriversModule {}
