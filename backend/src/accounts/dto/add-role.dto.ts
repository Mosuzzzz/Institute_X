import { IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';

export class AddRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}
