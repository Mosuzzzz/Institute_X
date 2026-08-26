import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { OidcAuthGuard } from '../auth/oidc-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CategoriesService } from './categories.service';

@ApiTags('majors')
@ApiBearerAuth()
@Controller('majors')
@UseGuards(OidcAuthGuard, RolesGuard)
export class MajorsController {
  constructor(private readonly referenceData: CategoriesService) {}

  @Get()
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.APPROVER, UserRole.OWNER)
  @ApiOkResponse({ description: 'Majors ordered by code' })
  list(): ReturnType<CategoriesService['listMajors']> {
    return this.referenceData.listMajors();
  }
}
