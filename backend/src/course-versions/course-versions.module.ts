import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { CourseVersionsService } from './course-versions.service';
import { CourseVersionsController } from './course-versions.controller';

@Module({
  imports: [AuthModule, MediaModule],
  controllers: [CourseVersionsController],
  providers: [CourseVersionsService],
  exports: [CourseVersionsService],
})
export class CourseVersionsModule {}
