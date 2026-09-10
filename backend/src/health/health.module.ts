import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { ReadinessIndicator } from './readiness.indicator';
import { MediaModule } from '../media/media.module';
import { SessionAuthModule } from '../auth/session-auth.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MediaModule, SessionAuthModule, AuthModule],
  controllers: [HealthController],
  providers: [ReadinessIndicator],
  exports: [ReadinessIndicator],
})
export class HealthModule {}
