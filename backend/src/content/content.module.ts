import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { CourseSectionsController } from './course-sections.controller';
import { DraftContentController } from './draft-content.controller';

@Module({
  imports: [AuthModule],
  controllers: [ContentController, CourseSectionsController, DraftContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
