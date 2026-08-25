import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TeacherPermissionsService } from './teacher-permissions.service';
import { TeacherPermissionsController } from './teacher-permissions.controller';

@Module({
  imports: [AuthModule],
  controllers: [TeacherPermissionsController],
  providers: [TeacherPermissionsService],
  exports: [TeacherPermissionsService],
})
export class TeacherPermissionsModule {}
