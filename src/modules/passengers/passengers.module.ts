import { Module } from '@nestjs/common';
import { StorageModule } from '../../shared/storage/storage.module';
import { PassengersController } from './passengers.controller';
import { PassengersService } from './passengers.service';
import { PassengersRepository } from './passengers.repository';

@Module({
  imports: [StorageModule],
  controllers: [PassengersController],
  providers: [PassengersService, PassengersRepository],
})
export class PassengersModule {}
