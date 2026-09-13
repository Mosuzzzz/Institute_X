import { validate } from 'class-validator';
import { UserRole } from '@prisma/client';
import { AddRoleDto } from './add-role.dto';

describe('AddRoleDto', () => {
  it.each([UserRole.TEACHER, UserRole.APPROVER, UserRole.REGISTRAR, UserRole.EXECUTIVE])(
    'accepts managed role %s',
    async (role) => {
      expect(await validate(Object.assign(new AddRoleDto(), { role }))).toHaveLength(0);
    },
  );

  it.each(['STUDENT', 'OWNER', 'ADMIN', 'approver', '', undefined, ['TEACHER']])(
    'rejects unmanaged or malformed role %s',
    async (role) => {
      expect((await validate(Object.assign(new AddRoleDto(), { role }))).length).toBeGreaterThan(0);
    },
  );
});
