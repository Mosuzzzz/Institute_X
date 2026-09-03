import { Body, Controller, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiConflictResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserValue } from '../auth/current-user.decorator';
import { OidcAuthGuard } from '../auth/oidc-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CoursesService } from './courses.service';
import { UpdateCourseVersionDto } from './dto/update-course-version.dto';

@ApiTags('course-versions')
@ApiBearerAuth()
@Controller('course-versions')
@UseGuards(OidcAuthGuard, RolesGuard)
export class CourseVersionDraftsController {
  constructor(private readonly courses: CoursesService) {}

  @Patch(':versionId')
  @Roles(UserRole.TEACHER)
  @ApiOkResponse({ description: 'Owned Draft Course Version metadata updated' })
  @ApiConflictResponse({ description: 'Published or submitted Versions cannot be edited' })
  update(
    @CurrentUser() user: CurrentUserValue,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Body() input: UpdateCourseVersionDto,
  ): ReturnType<CoursesService['updateDraft']> {
    return this.courses.updateDraft(user, versionId, input);
  }
}
