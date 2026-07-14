import { Module } from '@nestjs/common';
import { SessionKickService } from './session-kick.service';

@Module({
  providers: [SessionKickService],
  exports: [SessionKickService],
})
export class SessionKickModule {}
