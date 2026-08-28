import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QuizAuthoringService } from './quiz-authoring.service';
import { QuizzesController } from './quizzes.controller';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [AuthModule, MediaModule],
  controllers: [QuizzesController],
  providers: [QuizAuthoringService],
  exports: [QuizAuthoringService],
})
export class QuizzesModule {}
