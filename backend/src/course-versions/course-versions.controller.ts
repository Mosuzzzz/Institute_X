import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserValue } from '../auth/current-user.decorator';
import { OidcAuthGuard } from '../auth/oidc-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CourseVersionsService } from './course-versions.service';
import { ReviewVersionDto } from './dto/review-version.dto';

@ApiTags('course-versions')
@ApiBearerAuth()
@Controller('course-versions')
@UseGuards(OidcAuthGuard, RolesGuard)
export class CourseVersionsController {
  constructor(private readonly versions: CourseVersionsService) {}

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

  @Patch(':versionId/review')
  @HttpCode(204)
  @Roles(UserRole.APPROVER)
  @ApiNoContentResponse({ description: 'Version reviewed; approval auto-publishes' })
  review(
    @CurrentUser() user: CurrentUserValue,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Body() input: ReviewVersionDto,
  ): ReturnType<CourseVersionsService['review']> {
    return this.versions.review(user, versionId, input.decision, input.comment);
  }
}
