import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { CourseVersionDraftsController } from './course-version-drafts.controller';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [AuthModule, MediaModule],
  controllers: [CoursesController, CourseVersionDraftsController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
