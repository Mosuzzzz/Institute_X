import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserValue } from '../auth/current-user.decorator';
import { OidcAuthGuard } from '../auth/oidc-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';

@ApiTags('courses')
@ApiBearerAuth()
@Controller('courses')
@UseGuards(OidcAuthGuard, RolesGuard)
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Post()
  @Roles(UserRole.TEACHER)
  @ApiCreatedResponse({ description: 'Course and Version 1 Draft created' })
  @ApiForbiddenResponse({ description: 'Approved Teacher permission is required' })
  create(
    @CurrentUser() user: CurrentUserValue,
    @Body() input: CreateCourseDto,
  ): ReturnType<CoursesService['createCourse']> {
    return this.courses.createCourse(user, input);
  }

  @Post(':courseId/versions')
  @Roles(UserRole.TEACHER)
  @ApiCreatedResponse({ description: 'New Draft revision created from published metadata' })
  createRevision(
    @CurrentUser() user: CurrentUserValue,
    @Param('courseId', new ParseUUIDPipe({ version: '4' })) courseId: string,
  ): ReturnType<CoursesService['createRevision']> {
    return this.courses.createRevision(user, courseId);
  }
}
