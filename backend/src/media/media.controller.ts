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

@ApiTags('media')
@ApiBearerAuth()
@Controller('media')
@UseGuards(AuthGuard, RolesGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Delete(':assetId')
  @HttpCode(204)
  @Roles(UserRole.TEACHER)
  @ApiNoContentResponse({ description: 'Owned Draft media object and Content Item deleted' })
  delete(
    @CurrentUser() user: CurrentUserValue,
    @Param('assetId', new ParseUUIDPipe({ version: '4' })) assetId: string,
  ): ReturnType<MediaService['deleteDraftAsset']> {
    return this.media.deleteDraftAsset(user, assetId);
  }

  @Get(':assetId/view-url')
  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ description: 'Short-lived private media view URL' })
  viewUrl(
    @CurrentUser() user: CurrentUserValue,
    @Param('assetId', new ParseUUIDPipe({ version: '4' })) assetId: string,
  ): ReturnType<MediaService['createStudentViewUrl']> {
    return this.media.createStudentViewUrl({ ...user, majorId: user.majorId ?? null }, assetId);
  }

  @Get(':assetId/review-url')
  @Roles(UserRole.APPROVER)
  @ApiOkResponse({ description: 'Short-lived private media preview URL for submitted review' })
  reviewUrl(
    @CurrentUser() user: CurrentUserValue,
    @Param('assetId', new ParseUUIDPipe({ version: '4' })) assetId: string,
  ): ReturnType<MediaService['createReviewViewUrl']> {
    return this.media.createReviewViewUrl(user, assetId);
  }

  @Post(':assetId/complete')
  @HttpCode(200)
  @Roles(UserRole.TEACHER)
  @ApiOkResponse({ description: 'Uploaded object verified and marked READY' })
  complete(
    @CurrentUser() user: CurrentUserValue,
    @Param('assetId', new ParseUUIDPipe({ version: '4' })) assetId: string,
  ): ReturnType<MediaService['completeUpload']> {
    return this.media.completeUpload(user, assetId);
  }
}
