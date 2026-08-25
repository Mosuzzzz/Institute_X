import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserValue } from '../auth/current-user.decorator';
import { OidcAuthGuard } from '../auth/oidc-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MediaService } from './media.service';

@ApiTags('media')
@ApiBearerAuth()
@Controller('media')
@UseGuards(OidcAuthGuard, RolesGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get(':assetId/view-url')
  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ description: 'Short-lived private media view URL' })
  viewUrl(
    @CurrentUser() user: CurrentUserValue,
    @Param('assetId', new ParseUUIDPipe({ version: '4' })) assetId: string,
  ): ReturnType<MediaService['createStudentViewUrl']> {
    return this.media.createStudentViewUrl({ ...user, majorId: user.majorId ?? null }, assetId);
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
