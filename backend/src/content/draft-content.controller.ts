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
import { UpdateTextContentDto } from './dto/update-text-content.dto';

@ApiTags('course-content')
@ApiBearerAuth()
@Controller('content')
@UseGuards(OidcAuthGuard, RolesGuard)
export class DraftContentController {
  constructor(private readonly content: ContentService) {}

  @Patch(':contentId/text')
  @Roles(UserRole.TEACHER)
  @ApiOkResponse({ description: 'Owned Draft text content updated' })
  updateText(
    @CurrentUser() user: CurrentUserValue,
    @Param('contentId', new ParseUUIDPipe({ version: '4' })) contentId: string,
    @Body() input: UpdateTextContentDto,
  ): ReturnType<ContentService['updateText']> {
    return this.content.updateText(user, contentId, input);
  }

  @Delete(':contentId/text')
  @HttpCode(204)
  @Roles(UserRole.TEACHER)
  @ApiNoContentResponse({ description: 'Owned Draft text content deleted' })
  deleteText(
    @CurrentUser() user: CurrentUserValue,
    @Param('contentId', new ParseUUIDPipe({ version: '4' })) contentId: string,
  ): ReturnType<ContentService['deleteText']> {
    return this.content.deleteText(user, contentId);
  }
}
