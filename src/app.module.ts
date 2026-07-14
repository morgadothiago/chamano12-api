import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { DatabaseModule } from './database/database.module';
import { LocationModule } from './shared/location/location.module';
import { AuthModule } from './modules/auth/auth.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { RidesModule } from './modules/rides/rides.module';
import { WsModule } from './modules/ws/ws.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { PassengersModule } from './modules/passengers/passengers.module';
import { CouponsModule } from './modules/coupons/coupons.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), process.env.STORAGE_LOCAL_DIR ?? 'uploads'),
      serveRoot: '/uploads',
    }),
    DatabaseModule,
    LocationModule,
    AuthModule,
    DriversModule,
    RidesModule,
    WsModule,
    PricingModule,
    PassengersModule,
    CouponsModule,
  ],
})
export class AppModule {}
