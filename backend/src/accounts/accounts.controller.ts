import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserValue } from '../auth/current-user.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AccountsService } from './accounts.service';
import { AddRoleDto } from './dto/add-role.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpdateAccountStatusDto } from './dto/update-account-status.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('registrar/users')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.REGISTRAR)
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list(): ReturnType<AccountsService['list']> {
    return this.accounts.list();
  }

  @Post()
  create(@Body() input: CreateAccountDto): ReturnType<AccountsService['create']> {
    return this.accounts.create(input);
  }

  @Post(':userId/roles')
  addRole(
    @CurrentUser() actor: CurrentUserValue,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() input: AddRoleDto,
  ): ReturnType<AccountsService['addRole']> {
    return this.accounts.addRole(actor.id, userId, input.role);
  }

  @Delete(':userId/roles/:role')
  removeRole(
    @CurrentUser() actor: CurrentUserValue,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Param('role', new ParseEnumPipe(UserRole)) role: UserRole,
  ): ReturnType<AccountsService['removeRole']> {
    return this.accounts.removeRole(actor.id, userId, role);
  }

  @Patch(':userId')
  update(
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() input: UpdateAccountDto,
  ): ReturnType<AccountsService['update']> {
    return this.accounts.update(userId, input);
  }

  @Patch(':userId/status')
  updateStatus(
    @CurrentUser() actor: CurrentUserValue,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() input: UpdateAccountStatusDto,
  ): ReturnType<AccountsService['updateStatus']> {
    return this.accounts.updateStatus(actor.id, userId, input.status);
  }

  @Post(':userId/reset-password')
  resetPassword(
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() input: ResetPasswordDto,
  ): ReturnType<AccountsService['resetPassword']> {
    return this.accounts.resetPassword(userId, input.password);
  }
}
