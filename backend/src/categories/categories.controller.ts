import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserValue } from '../auth/current-user.decorator';
import { OidcAuthGuard } from '../auth/oidc-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
@UseGuards(OidcAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.APPROVER, UserRole.OWNER)
  @ApiOkResponse({ description: 'Course categories ordered by name' })
  list(): ReturnType<CategoriesService['list']> {
    return this.categories.list();
  }

  @Post()
  @Roles(UserRole.OWNER)
  @ApiCreatedResponse({ description: 'Course category created' })
  @ApiConflictResponse({ description: 'Category slug or name already exists' })
  create(
    @CurrentUser() user: CurrentUserValue,
    @Body() input: CreateCategoryDto,
  ): ReturnType<CategoriesService['create']> {
    return this.categories.create(user, input);
  }

  @Patch(':categoryId')
  @Roles(UserRole.OWNER)
  @ApiOkResponse({ description: 'Course category updated' })
  @ApiConflictResponse({ description: 'Category slug or name already exists' })
  update(
    @CurrentUser() user: CurrentUserValue,
    @Param('categoryId', new ParseUUIDPipe({ version: '4' })) categoryId: string,
    @Body() input: UpdateCategoryDto,
  ): ReturnType<CategoriesService['update']> {
    return this.categories.update(user, categoryId, input);
  }
}
