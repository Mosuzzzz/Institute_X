import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Query,
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
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpdateAccountStatusDto } from './dto/update-account-status.dto';

@Controller('registrar/users')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.REGISTRAR)
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list(@Query('search') search?: string): ReturnType<AccountsService['list']> {
    return this.accounts.list(search);
  }

  @Get('role-audits')
  audits(): ReturnType<AccountsService['listRoleAudits']> {
    return this.accounts.listRoleAudits();
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
}
