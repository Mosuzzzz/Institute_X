import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserValue } from '../auth/current-user.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AddQuestionDto } from './dto/add-question.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { QuizAuthoringService } from './quiz-authoring.service';
import { UpdateQuizDto } from './dto/update-quiz.dto';

@ApiTags('quizzes')
@ApiBearerAuth()
@Controller()
@UseGuards(AuthGuard, RolesGuard)
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

  @Patch('quizzes/:quizId')
  @Roles(UserRole.TEACHER)
  @ApiOkResponse({ description: 'Owned Draft Quiz details updated' })
  updateQuiz(
    @CurrentUser() user: CurrentUserValue,
    @Param('quizId', new ParseUUIDPipe({ version: '4' })) quizId: string,
    @Body() input: UpdateQuizDto,
  ): ReturnType<QuizAuthoringService['updateQuiz']> {
    return this.quizzes.updateQuiz(user, quizId, input);
  }

  @Patch('questions/:questionId')
  @Roles(UserRole.TEACHER)
  @ApiOkResponse({ description: 'Owned Draft question and answer options updated' })
  updateQuestion(
    @CurrentUser() user: CurrentUserValue,
    @Param('questionId', new ParseUUIDPipe({ version: '4' })) questionId: string,
    @Body() input: AddQuestionDto,
  ): ReturnType<QuizAuthoringService['updateQuestion']> {
    return this.quizzes.updateQuestion(user, questionId, input);
  }

  @Delete('questions/:questionId')
  @HttpCode(204)
  @Roles(UserRole.TEACHER)
  @ApiNoContentResponse({ description: 'One owned Draft question removed' })
  deleteQuestion(
    @CurrentUser() user: CurrentUserValue,
    @Param('questionId', new ParseUUIDPipe({ version: '4' })) questionId: string,
  ): ReturnType<QuizAuthoringService['deleteQuestion']> {
    return this.quizzes.deleteQuestion(user, questionId);
  }

  @Delete('quizzes/:quizId/questions')
  @HttpCode(204)
  @Roles(UserRole.TEACHER)
  @ApiNoContentResponse({ description: 'Every question removed from an owned Draft Quiz' })
  clearQuestions(
    @CurrentUser() user: CurrentUserValue,
    @Param('quizId', new ParseUUIDPipe({ version: '4' })) quizId: string,
  ): ReturnType<QuizAuthoringService['clearQuestions']> {
    return this.quizzes.clearQuestions(user, quizId);
  }

  @Delete('quizzes/:quizId')
  @HttpCode(204)
  @Roles(UserRole.TEACHER)
  @ApiNoContentResponse({ description: 'Owned Draft Quiz removed' })
  deleteQuiz(
    @CurrentUser() user: CurrentUserValue,
    @Param('quizId', new ParseUUIDPipe({ version: '4' })) quizId: string,
  ): ReturnType<QuizAuthoringService['deleteQuiz']> {
    return this.quizzes.deleteQuiz(user, quizId);
  }
}
