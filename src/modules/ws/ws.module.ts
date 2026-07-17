import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WsAppGateway } from './ws-passenger.gateway';
import { RidesModule } from '../rides/rides.module';
import { DriversModule } from '../drivers/drivers.module';
import { AuthModule } from '../auth/auth.module';
import { SessionKickModule } from '../../shared/session-kick/session-kick.module';

@Module({
  imports: [
    forwardRef(() => RidesModule),
    DriversModule,
    AuthModule,
    SessionKickModule,
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
  exports: [WsAppGateway],
})
export class WsModule {}
