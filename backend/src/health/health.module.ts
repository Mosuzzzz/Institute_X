import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { ReadinessIndicator } from './readiness.indicator';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [MediaModule],
  controllers: [HealthController],
  providers: [ReadinessIndicator],
  exports: [ReadinessIndicator],
})
export class HealthModule {}
