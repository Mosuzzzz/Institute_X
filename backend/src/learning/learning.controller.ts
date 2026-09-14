import { Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserValue } from '../auth/current-user.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CourseAccessService } from './course-access.service';
import { ListCoursesQueryDto } from './dto/list-courses-query.dto';

@ApiTags('student-learning')
@ApiBearerAuth()
@Controller('courses')
@UseGuards(AuthGuard, RolesGuard)
export class LearningController {
  constructor(private readonly access: CourseAccessService) {}

  @Get()
  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ description: 'Published Course catalog eligible for the Student Major' })
  list(
    @CurrentUser() user: CurrentUserValue,
    @Query() query: ListCoursesQueryDto,
  ): ReturnType<CourseAccessService['listEligibleCourses']> {
    return this.access.listEligibleCourses(
      { ...user, majorId: user.majorId ?? null },
      query.categoryId,
    );
  }

  @Post(':courseId/enter')
  @Roles(UserRole.STUDENT)
  @ApiCreatedResponse({ description: 'Course entered and enrollment ensured' })
  enter(
    @CurrentUser() user: CurrentUserValue,
    @Param('courseId', new ParseUUIDPipe({ version: '4' })) courseId: string,
  ): ReturnType<CourseAccessService['enterCourse']> {
    return this.access.enterCourse({ ...user, majorId: user.majorId ?? null }, courseId);
  }

  @Get(':courseId/content')
  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ description: 'Ordered content from the unlocked published Course Version' })
  content(
    @CurrentUser() user: CurrentUserValue,
    @Param('courseId', new ParseUUIDPipe({ version: '4' })) courseId: string,
  ): ReturnType<CourseAccessService['getPublishedContent']> {
    return this.access.getPublishedContent({ ...user, majorId: user.majorId ?? null }, courseId);
  }

  @Post(':courseId/content/:contentItemId/complete')
  @Roles(UserRole.STUDENT)
  completeLesson(
    @CurrentUser() user: CurrentUserValue,
    @Param('courseId', new ParseUUIDPipe({ version: '4' })) courseId: string,
    @Param('contentItemId', new ParseUUIDPipe({ version: '4' })) contentItemId: string,
  ): ReturnType<CourseAccessService['completeLesson']> {
    return this.access.completeLesson(
      { ...user, majorId: user.majorId ?? null },
      courseId,
      contentItemId,
    );
  }
}
