import { Module } from '@nestjs/common';
import { PassengersController } from './passengers.controller';
import { PassengersService } from './passengers.service';
import { PassengersRepository } from './passengers.repository';

@Module({
  controllers: [PassengersController],
  providers: [PassengersService, PassengersRepository],
})
export class PassengersModule {}
