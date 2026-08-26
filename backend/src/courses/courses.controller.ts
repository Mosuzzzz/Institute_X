import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserValue } from '../auth/current-user.decorator';
import { OidcAuthGuard } from '../auth/oidc-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { ReplaceCourseCategoriesDto } from './dto/replace-course-categories.dto';

@ApiTags('courses')
@ApiBearerAuth()
@Controller('courses')
@UseGuards(OidcAuthGuard, RolesGuard)
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get('mine')
  @Roles(UserRole.TEACHER)
  @ApiOkResponse({ description: 'Authenticated Teacher Courses and latest Version states' })
  mine(@CurrentUser() user: CurrentUserValue): ReturnType<CoursesService['listOwned']> {
    return this.courses.listOwned(user);
  }

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

  @Put(':courseId/categories')
  @Roles(UserRole.TEACHER)
  @ApiOkResponse({ description: 'Owned Course categories replaced' })
  replaceCategories(
    @CurrentUser() user: CurrentUserValue,
    @Param('courseId', new ParseUUIDPipe({ version: '4' })) courseId: string,
    @Body() input: ReplaceCourseCategoriesDto,
  ): ReturnType<CoursesService['replaceCategories']> {
    return this.courses.replaceCategories(user, courseId, input.categoryIds);
  }
}
