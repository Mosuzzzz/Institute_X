import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserValue } from '../auth/current-user.decorator';
import { OidcAuthGuard } from '../auth/oidc-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RequestPermissionDto } from './dto/request-permission.dto';
import { ReviewPermissionDto } from './dto/review-permission.dto';
import { TeacherPermissionsService } from './teacher-permissions.service';

@ApiTags('teacher-permissions')
@ApiBearerAuth()
@Controller('teacher-permissions')
@UseGuards(OidcAuthGuard, RolesGuard)
export class TeacherPermissionsController {
  constructor(private readonly permissions: TeacherPermissionsService) {}

  @Post()
  @Roles(UserRole.TEACHER)
  @ApiCreatedResponse({ description: 'Teacher permission request created' })
  @ApiForbiddenResponse({ description: 'TEACHER role is required' })
  request(
    @CurrentUser() user: CurrentUserValue,
    @Body() input: RequestPermissionDto,
  ): ReturnType<TeacherPermissionsService['requestPermission']> {
    return this.permissions.requestPermission(user, input.requestMessage);
  }

  @Patch(':requestId/review')
  @HttpCode(204)
  @Roles(UserRole.APPROVER)
  review(
    @CurrentUser() user: CurrentUserValue,
    @Param('requestId', new ParseUUIDPipe({ version: '4' })) requestId: string,
    @Body() input: ReviewPermissionDto,
  ): ReturnType<TeacherPermissionsService['review']> {
    return this.permissions.review(user, requestId, input.decision, input.comment);
  }
}
