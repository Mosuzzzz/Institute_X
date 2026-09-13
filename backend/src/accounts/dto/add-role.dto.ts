import { IsIn } from 'class-validator';
import { UserRole } from '@prisma/client';

export class AddRoleDto {
  @IsIn([UserRole.TEACHER, UserRole.APPROVER, UserRole.REGISTRAR, UserRole.EXECUTIVE])
  role!: UserRole;
}
