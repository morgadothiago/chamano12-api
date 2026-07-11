import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WsAppGateway } from './ws-passenger.gateway';
import { RidesModule } from '../rides/rides.module';
import { DriversModule } from '../drivers/drivers.module';

@Module({
  imports: [
    RidesModule,
    DriversModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '1d') },
      }),
    }),
  ],
  providers: [WsAppGateway],
})
export class WsModule {}
