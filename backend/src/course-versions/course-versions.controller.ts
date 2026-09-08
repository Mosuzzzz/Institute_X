import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserValue } from '../auth/current-user.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CourseVersionsService } from './course-versions.service';
import { ReviewVersionDto } from './dto/review-version.dto';

@ApiTags('course-versions')
@ApiBearerAuth()
@Controller('course-versions')
@UseGuards(AuthGuard, RolesGuard)
export class CourseVersionsController {
  constructor(private readonly versions: CourseVersionsService) {}

  @Get('pending-review')
  @Roles(UserRole.APPROVER)
  @ApiOkResponse({ description: 'Oldest-first submitted Course Version review queue' })
  pending(
    @CurrentUser() user: CurrentUserValue,
  ): ReturnType<CourseVersionsService['listSubmitted']> {
    return this.versions.listSubmitted(user);
  }

  @Post(':versionId/submit')
  @HttpCode(204)
  @Roles(UserRole.TEACHER)
  @ApiNoContentResponse({ description: 'Draft submitted for review' })
  submit(
    @CurrentUser() user: CurrentUserValue,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
  ): ReturnType<CourseVersionsService['submit']> {
    return this.versions.submit(user, versionId);
  }

  @Post(':versionId/reopen')
  @HttpCode(204)
  @Roles(UserRole.TEACHER)
  @ApiNoContentResponse({ description: 'Rejected Version reopened as a Draft for correction' })
  reopen(
    @CurrentUser() user: CurrentUserValue,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
  ): ReturnType<CourseVersionsService['reopenRejected']> {
    return this.versions.reopenRejected(user, versionId);
  }

  @Delete(':versionId')
  @HttpCode(204)
  @Roles(UserRole.TEACHER)
  @ApiNoContentResponse({ description: 'Draft discarded; existing published Version retained' })
  discard(
    @CurrentUser() user: CurrentUserValue,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
  ): ReturnType<CourseVersionsService['discardDraft']> {
    return this.versions.discardDraft(user, versionId);
  }

  @Post(':versionId/unpublish')
  @HttpCode(204)
  @Roles(UserRole.TEACHER)
  @ApiNoContentResponse({ description: 'Published Version removed from active catalogs' })
  unpublish(
    @CurrentUser() user: CurrentUserValue,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
  ): ReturnType<CourseVersionsService['unpublish']> {
    return this.versions.unpublish(user, versionId);
  }

  @Post(':versionId/publish')
  @HttpCode(204)
  @Roles(UserRole.TEACHER)
  @ApiNoContentResponse({ description: 'Unpublished Version returned to active catalogs' })
  publish(
    @CurrentUser() user: CurrentUserValue,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
  ): ReturnType<CourseVersionsService['republish']> {
    return this.versions.republish(user, versionId);
  }

  @Patch(':versionId/review')
  @HttpCode(204)
  @Roles(UserRole.APPROVER)
  @ApiNoContentResponse({ description: 'Version reviewed; approval publishes it automatically' })
  review(
    @CurrentUser() user: CurrentUserValue,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Body() input: ReviewVersionDto,
  ): ReturnType<CourseVersionsService['review']> {
    return this.versions.review(user, versionId, input.decision, input.comment);
  }
}
