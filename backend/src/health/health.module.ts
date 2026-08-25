import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { ReadinessIndicator } from './readiness.indicator';

@Module({
  controllers: [HealthController],
  providers: [ReadinessIndicator],
  exports: [ReadinessIndicator],
})
export class HealthModule {}
