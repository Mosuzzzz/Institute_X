import { AccountStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export type MockUserDefinition = {
  email: string;
  fullName: string;
  primaryRole: UserRole;
  roles: UserRole[];
  majorId: string | null;
};

const STUDENT_MAJOR_ID = '00000000-0000-4000-8000-000000000109';

export const MOCK_USERS: MockUserDefinition[] = [
  {
    email: 'student@x.ac.th',
    fullName: 'Mock Student',
    primaryRole: UserRole.STUDENT,
    roles: [UserRole.STUDENT],
    majorId: STUDENT_MAJOR_ID,
  },
  {
    email: 'teacher@x.ac.th',
    fullName: 'Mock Teacher',
    primaryRole: UserRole.TEACHER,
    roles: [UserRole.STUDENT, UserRole.TEACHER],
    majorId: null,
  },
  {
    email: 'approver@x.ac.th',
    fullName: 'Mock Approver',
    primaryRole: UserRole.APPROVER,
    roles: [UserRole.STUDENT, UserRole.APPROVER],
    majorId: null,
  },
  {
    email: 'registrar@x.ac.th',
    fullName: 'Mock Registrar',
    primaryRole: UserRole.REGISTRAR,
    roles: [UserRole.STUDENT, UserRole.REGISTRAR],
    majorId: null,
  },
  {
    email: 'executive@x.ac.th',
    fullName: 'Mock Executive',
    primaryRole: UserRole.EXECUTIVE,
    roles: [UserRole.STUDENT, UserRole.EXECUTIVE],
    majorId: null,
  },
];

export function assertMockSeedingAllowed(nodeEnvironment: string | undefined): void {
  if (nodeEnvironment === 'production') {
    throw new Error('Mock users cannot be seeded in production');
  }
}

export async function seedMockUsers(
  prisma: PrismaService,
): Promise<Array<{ id: string; email: string; roles: UserRole[] }>> {
  const seeded: Array<{ id: string; email: string; roles: UserRole[] }> = [];

  for (const definition of MOCK_USERS) {
    const user = await prisma.user.upsert({
      where: { universityEmail: definition.email },
      create: {
        universityEmail: definition.email,
        fullName: definition.fullName,
        emailVerifiedAt: new Date(),
        accountStatus: AccountStatus.ACTIVE,
        majorId: definition.majorId,
      },
      update: {
        fullName: definition.fullName,
        emailVerifiedAt: new Date(),
        accountStatus: AccountStatus.ACTIVE,
        majorId: definition.majorId,
      },
      select: { id: true },
    });
    await prisma.userRoleAssignment.deleteMany({ where: { userId: user.id } });
    await prisma.userRoleAssignment.createMany({
      data: definition.roles.map((role) => ({ userId: user.id, role })),
      skipDuplicates: true,
    });
    seeded.push({ id: user.id, email: definition.email, roles: definition.roles });
  }

  return seeded;
}
