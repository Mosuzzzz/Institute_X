import { Equals } from 'class-validator';
import { UserRole } from '@prisma/client';

export class AddRoleDto {
  @Equals(UserRole.TEACHER)
  role!: UserRole;
}
