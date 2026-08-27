import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserValue } from '../auth/current-user.decorator';
import { OidcAuthGuard } from '../auth/oidc-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { InitializeUploadDto } from './dto/initialize-upload.dto';
import { InitializeCoverUploadDto } from './dto/initialize-cover-upload.dto';
import { MediaService } from './media.service';

@ApiTags('media')
@ApiBearerAuth()
@Controller('course-versions')
@UseGuards(OidcAuthGuard, RolesGuard)
export class MediaUploadsController {
  constructor(private readonly media: MediaService) {}

  @Post(':versionId/media/uploads')
  @Roles(UserRole.TEACHER)
  @ApiCreatedResponse({ description: 'Private upload reserved and signed target returned' })
  initialize(
    @CurrentUser() user: CurrentUserValue,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Body() input: InitializeUploadDto,
  ): ReturnType<MediaService['initializeUpload']> {
    return this.media.initializeUpload(user, versionId, input);
  }

  @Post(':versionId/cover/uploads')
  @Roles(UserRole.TEACHER)
  @ApiCreatedResponse({ description: 'Private Course cover upload reserved' })
  initializeCover(
    @CurrentUser() user: CurrentUserValue,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Body() input: InitializeCoverUploadDto,
  ): ReturnType<MediaService['initializeCoverUpload']> {
    return this.media.initializeCoverUpload(user, versionId, input);
  }
}
