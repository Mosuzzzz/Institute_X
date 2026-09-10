import { AccountStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateAccountStatusDto {
  @IsEnum(AccountStatus)
  status!: AccountStatus;
}
