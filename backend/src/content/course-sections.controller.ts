import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserValue } from '../auth/current-user.decorator';
import { OidcAuthGuard } from '../auth/oidc-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ContentService } from './content.service';
import { UpdateCourseSectionDto } from './dto/update-course-section.dto';

@ApiTags('course-content')
@ApiBearerAuth()
@Controller('sections')
@UseGuards(OidcAuthGuard, RolesGuard)
export class CourseSectionsController {
  constructor(private readonly content: ContentService) {}

  @Patch(':sectionId')
  @Roles(UserRole.TEACHER)
  @ApiOkResponse({ description: 'Owned Draft Course Section updated' })
  updateSection(
    @CurrentUser() user: CurrentUserValue,
    @Param('sectionId', new ParseUUIDPipe({ version: '4' })) sectionId: string,
    @Body() input: UpdateCourseSectionDto,
  ): ReturnType<ContentService['updateSection']> {
    return this.content.updateSection(user, sectionId, input);
  }

  @Delete(':sectionId')
  @HttpCode(204)
  @Roles(UserRole.TEACHER)
  @ApiNoContentResponse({ description: 'Owned Draft Course Section deleted' })
  deleteSection(
    @CurrentUser() user: CurrentUserValue,
    @Param('sectionId', new ParseUUIDPipe({ version: '4' })) sectionId: string,
  ): ReturnType<ContentService['deleteSection']> {
    return this.content.deleteSection(user, sectionId);
  }
}
