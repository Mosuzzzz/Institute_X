import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserValue } from '../auth/current-user.decorator';
import { OidcAuthGuard } from '../auth/oidc-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { PostTestService } from './post-test.service';
import { PreTestService } from './pre-test.service';

@ApiTags('student-assessments')
@ApiBearerAuth()
@Controller()
@UseGuards(OidcAuthGuard, RolesGuard)
export class AssessmentsController {
  constructor(
    private readonly preTests: PreTestService,
    private readonly postTests: PostTestService,
  ) {}

  @Post('pre-tests/:quizId/attempts')
  @Roles(UserRole.STUDENT)
  @ApiCreatedResponse({ description: 'Pre-Test attempt started' })
  startPreTest(
    @CurrentUser() user: CurrentUserValue,
    @Param('quizId', new ParseUUIDPipe({ version: '4' })) quizId: string,
  ): ReturnType<PreTestService['start']> {
    return this.preTests.start(user, quizId);
  }

  @Post('pre-test-attempts/:attemptId/submit')
  @HttpCode(200)
  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ description: 'Pre-Test graded and content unlocked' })
  submitPreTest(
    @CurrentUser() user: CurrentUserValue,
    @Param('attemptId', new ParseUUIDPipe({ version: '4' })) attemptId: string,
    @Body() input: SubmitAttemptDto,
  ): ReturnType<PreTestService['submit']> {
    return this.preTests.submit(user, attemptId, input.answers);
  }

  @Get('pre-tests/:quizId/result')
  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ description: 'Authenticated Student completed Pre-Test score' })
  preTestResult(
    @CurrentUser() user: CurrentUserValue,
    @Param('quizId', new ParseUUIDPipe({ version: '4' })) quizId: string,
  ): ReturnType<PreTestService['getResult']> {
    return this.preTests.getResult(user, quizId);
  }

  @Post('post-tests/:quizId/attempts')
  @Roles(UserRole.STUDENT)
  @ApiCreatedResponse({ description: 'Independent Post-Test attempt started' })
  startPostTest(
    @CurrentUser() user: CurrentUserValue,
    @Param('quizId', new ParseUUIDPipe({ version: '4' })) quizId: string,
  ): ReturnType<PostTestService['start']> {
    return this.postTests.start(user, quizId);
  }

  @Post('post-test-attempts/:attemptId/submit')
  @HttpCode(200)
  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ description: 'Post-Test graded with PASS or NOT_PASS' })
  submitPostTest(
    @CurrentUser() user: CurrentUserValue,
    @Param('attemptId', new ParseUUIDPipe({ version: '4' })) attemptId: string,
    @Body() input: SubmitAttemptDto,
  ): ReturnType<PostTestService['submit']> {
    return this.postTests.submit(user, attemptId, input.answers);
  }

  @Get('post-tests/:quizId/results')
  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ description: 'Authenticated Student Post-Test history' })
  results(
    @CurrentUser() user: CurrentUserValue,
    @Param('quizId', new ParseUUIDPipe({ version: '4' })) quizId: string,
  ): ReturnType<PostTestService['getResults']> {
    return this.postTests.getResults(user, quizId);
  }
}
