import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserValue } from '../auth/current-user.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MediaService } from './media.service';

@ApiTags('course-covers')
@ApiBearerAuth()
@Controller('course-covers')
@UseGuards(AuthGuard, RolesGuard)
export class CourseCoversController {
  constructor(private readonly media: MediaService) {}

  @Get(':assetId/view-url')
  @Roles(UserRole.TEACHER, UserRole.STUDENT, UserRole.APPROVER)
  @ApiOkResponse({ description: 'Short-lived private Course cover URL' })
  viewUrl(
    @CurrentUser() user: CurrentUserValue,
    @Param('assetId', new ParseUUIDPipe({ version: '4' })) assetId: string,
  ): ReturnType<MediaService['createCoverViewUrl']> {
    return this.media.createCoverViewUrl(user, assetId);
  }

  @Post(':assetId/complete')
  @HttpCode(200)
  @Roles(UserRole.TEACHER)
  @ApiOkResponse({ description: 'Uploaded Course cover verified and marked READY' })
  complete(
    @CurrentUser() user: CurrentUserValue,
    @Param('assetId', new ParseUUIDPipe({ version: '4' })) assetId: string,
  ): ReturnType<MediaService['completeCoverUpload']> {
    return this.media.completeCoverUpload(user, assetId);
  }

  @Delete(':assetId')
  @HttpCode(204)
  @Roles(UserRole.TEACHER)
  @ApiNoContentResponse({ description: 'Owned Draft Course cover deleted' })
  delete(
    @CurrentUser() user: CurrentUserValue,
    @Param('assetId', new ParseUUIDPipe({ version: '4' })) assetId: string,
  ): ReturnType<MediaService['deleteDraftCover']> {
    return this.media.deleteDraftCover(user, assetId);
  }
}
