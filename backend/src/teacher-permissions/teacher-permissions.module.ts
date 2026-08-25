import { Module } from '@nestjs/common';
import { TeacherPermissionsService } from './teacher-permissions.service';

@Module({
  providers: [TeacherPermissionsService],
  exports: [TeacherPermissionsService],
})
export class TeacherPermissionsModule {}
