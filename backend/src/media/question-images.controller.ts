import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserValue } from '../auth/current-user.decorator';
import { OidcAuthGuard } from '../auth/oidc-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { InitializeQuestionImageUploadDto } from './dto/initialize-question-image-upload.dto';
import { MediaService } from './media.service';

@ApiTags('question-images')
@ApiBearerAuth()
@Controller()
@UseGuards(OidcAuthGuard, RolesGuard)
export class QuestionImagesController {
  constructor(private readonly media: MediaService) {}

  @Post('questions/:questionId/image/uploads')
  @Roles(UserRole.TEACHER)
  @ApiCreatedResponse({ description: 'Private question image upload reserved' })
  initialize(
    @CurrentUser() user: CurrentUserValue,
    @Param('questionId', new ParseUUIDPipe({ version: '4' })) questionId: string,
    @Body() input: InitializeQuestionImageUploadDto,
  ): ReturnType<MediaService['initializeQuestionImageUpload']> {
    return this.media.initializeQuestionImageUpload(user, questionId, input);
  }

  @Post('question-images/:assetId/complete')
  @HttpCode(200)
  @Roles(UserRole.TEACHER)
  @ApiOkResponse({ description: 'Question image verified and marked READY' })
  complete(
    @CurrentUser() user: CurrentUserValue,
    @Param('assetId', new ParseUUIDPipe({ version: '4' })) assetId: string,
  ): ReturnType<MediaService['completeQuestionImageUpload']> {
    return this.media.completeQuestionImageUpload(user, assetId);
  }

  @Get('question-images/:assetId/view-url')
  @Roles(UserRole.TEACHER, UserRole.STUDENT, UserRole.APPROVER)
  @ApiOkResponse({ description: 'Short-lived private question image URL' })
  viewUrl(
    @CurrentUser() user: CurrentUserValue,
    @Param('assetId', new ParseUUIDPipe({ version: '4' })) assetId: string,
  ): ReturnType<MediaService['createQuestionImageViewUrl']> {
    return this.media.createQuestionImageViewUrl(user, assetId);
  }

  @Delete('question-images/:assetId')
  @HttpCode(204)
  @Roles(UserRole.TEACHER)
  @ApiNoContentResponse({ description: 'Owned Draft question image deleted' })
  delete(
    @CurrentUser() user: CurrentUserValue,
    @Param('assetId', new ParseUUIDPipe({ version: '4' })) assetId: string,
  ): ReturnType<MediaService['deleteDraftQuestionImage']> {
    return this.media.deleteDraftQuestionImage(user, assetId);
  }
}
