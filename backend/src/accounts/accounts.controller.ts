import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserValue } from '../auth/current-user.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AccountsService } from './accounts.service';
import { AddRoleDto } from './dto/add-role.dto';
import { CreateAccountDto } from './dto/create-account.dto';

@Controller('executive/users')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.EXECUTIVE)
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

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
}
