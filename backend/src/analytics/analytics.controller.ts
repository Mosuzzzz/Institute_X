import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserValue } from '../auth/current-user.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('teacher/courses/:courseId/analytics')
  @Roles(UserRole.TEACHER)
  @ApiOkResponse({ description: 'Owned Course enrollment, traffic, and assessment analytics' })
  teacherCourse(
    @CurrentUser() user: CurrentUserValue,
    @Param('courseId', new ParseUUIDPipe({ version: '4' })) courseId: string,
  ): ReturnType<AnalyticsService['getTeacherCourseAnalytics']> {
    return this.analytics.getTeacherCourseAnalytics(user, courseId);
  }

  @Get('executive/dashboard')
  @Roles(UserRole.EXECUTIVE)
  @ApiOkResponse({ description: 'System-wide Owner dashboard' })
  ownerDashboard(
    @CurrentUser() user: CurrentUserValue,
  ): ReturnType<AnalyticsService['getOwnerDashboard']> {
    return this.analytics.getOwnerDashboard(user);
  }
}
