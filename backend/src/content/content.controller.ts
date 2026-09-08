import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserValue } from '../auth/current-user.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ContentService } from './content.service';
import { AddTextContentDto } from './dto/add-text-content.dto';
import { CreateCourseSectionDto } from './dto/create-course-section.dto';

@ApiTags('course-content')
@ApiBearerAuth()
@Controller('course-versions')
@UseGuards(AuthGuard, RolesGuard)
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Post(':versionId/sections')
  @Roles(UserRole.TEACHER)
  @ApiCreatedResponse({ description: 'Ordered Course Section created' })
  createSection(
    @CurrentUser() user: CurrentUserValue,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Body() input: CreateCourseSectionDto,
  ): ReturnType<ContentService['createSection']> {
    return this.content.createSection(user, versionId, input);
  }

  @Post(':versionId/content/text')
  @Roles(UserRole.TEACHER)
  @ApiCreatedResponse({ description: 'Ordered text content created' })
  addText(
    @CurrentUser() user: CurrentUserValue,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Body() input: AddTextContentDto,
  ): ReturnType<ContentService['addText']> {
    return this.content.addText(user, versionId, input);
  }
}
