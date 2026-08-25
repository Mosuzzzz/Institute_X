import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
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

  @Get('me')
  @Roles(UserRole.TEACHER)
  @ApiOkResponse({ description: 'Latest permission state for the authenticated Teacher' })
  mine(
    @CurrentUser() user: CurrentUserValue,
  ): ReturnType<TeacherPermissionsService['getMyLatest']> {
    return this.permissions.getMyLatest(user);
  }

  @Get('pending')
  @Roles(UserRole.APPROVER)
  @ApiOkResponse({ description: 'Oldest-first pending Teacher permission review queue' })
  pending(
    @CurrentUser() user: CurrentUserValue,
  ): ReturnType<TeacherPermissionsService['listPending']> {
    return this.permissions.listPending(user);
  }

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
