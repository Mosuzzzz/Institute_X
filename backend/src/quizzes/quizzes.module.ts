import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QuizAuthoringService } from './quiz-authoring.service';
import { QuizzesController } from './quizzes.controller';

@Module({
  imports: [AuthModule],
  controllers: [QuizzesController],
  providers: [QuizAuthoringService],
  exports: [QuizAuthoringService],
})
export class QuizzesModule {}
