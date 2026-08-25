import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';

@Module({
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
