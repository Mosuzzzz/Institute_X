import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserValue } from '../auth/current-user.decorator';
import { OidcAuthGuard } from '../auth/oidc-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AddQuestionDto } from './dto/add-question.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { QuizAuthoringService } from './quiz-authoring.service';

@ApiTags('quizzes')
@ApiBearerAuth()
@Controller()
@UseGuards(OidcAuthGuard, RolesGuard)
export class QuizzesController {
  constructor(private readonly quizzes: QuizAuthoringService) {}

  @Post('course-versions/:versionId/quizzes')
  @Roles(UserRole.TEACHER)
  @ApiCreatedResponse({ description: 'Pre-Test or Post-Test created' })
  createQuiz(
    @CurrentUser() user: CurrentUserValue,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Body() input: CreateQuizDto,
  ): ReturnType<QuizAuthoringService['createQuiz']> {
    return this.quizzes.createQuiz(user, versionId, input);
  }

  @Post('quizzes/:quizId/questions')
  @Roles(UserRole.TEACHER)
  @ApiCreatedResponse({ description: 'Multiple Choice question created' })
  addQuestion(
    @CurrentUser() user: CurrentUserValue,
    @Param('quizId', new ParseUUIDPipe({ version: '4' })) quizId: string,
    @Body() input: AddQuestionDto,
  ): ReturnType<QuizAuthoringService['addQuestion']> {
    return this.quizzes.addQuestion(user, quizId, input);
  }
}
