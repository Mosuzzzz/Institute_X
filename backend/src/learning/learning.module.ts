import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CourseAccessService } from './course-access.service';
import { LearningController } from './learning.controller';

@Module({
  imports: [AuthModule],
  controllers: [LearningController],
  providers: [CourseAccessService],
  exports: [CourseAccessService],
})
export class LearningModule {}
