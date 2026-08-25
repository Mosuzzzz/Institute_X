import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserValue } from '../auth/current-user.decorator';
import { OidcAuthGuard } from '../auth/oidc-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ContentService } from './content.service';
import { AddTextContentDto } from './dto/add-text-content.dto';

@ApiTags('course-content')
@ApiBearerAuth()
@Controller('course-versions')
@UseGuards(OidcAuthGuard, RolesGuard)
export class ContentController {
  constructor(private readonly content: ContentService) {}

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
