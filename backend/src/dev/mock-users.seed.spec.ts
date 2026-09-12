import { TeacherPermissionStatus, UserRole } from '@prisma/client';
import { MOCK_USERS, assertMockSeedingAllowed, seedMockUsers } from './mock-users.seed';

describe('mock user seed', () => {
  it('defines one @x.ac.th account for every application role', () => {
    expect(MOCK_USERS).toHaveLength(Object.values(UserRole).length);
    expect(MOCK_USERS.flatMap((user) => user.roles)).toEqual(expect.arrayContaining(Object.values(UserRole)));
    for (const user of MOCK_USERS) {
      expect(user.email).toMatch(/@x\.ac\.th$/);
      expect(user.roles).toContain(UserRole.STUDENT);
    }
  });

  it('upserts users, assigns roles, and pre-approves the Teacher', async () => {
    const ids = new Map(MOCK_USERS.map((user) => [user.email, `${user.email.split('@')[0]}-id`]));
    const prisma = {
      user: {
        upsert: jest.fn(({ where }: { where: { universityEmail: string } }) =>
          Promise.resolve({ id: ids.get(where.universityEmail) }),
        ),
      },
      userRoleAssignment: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      teacherPermissionRequest: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'permission-id' }),
      },
    };
    const result = await seedMockUsers(prisma as never);

    expect(result).toHaveLength(MOCK_USERS.length);
    expect(prisma.user.upsert).toHaveBeenCalledTimes(MOCK_USERS.length);
    expect(prisma.user.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ emailVerifiedAt: expect.any(Date) }) }));
    expect(prisma.teacherPermissionRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        teacherId: 'teacher-id',
        reviewedById: 'approver-id',
        status: TeacherPermissionStatus.APPROVED,
      }),
    });
  });

  it('refuses to seed mock credentials in production', () => {
    expect(() => assertMockSeedingAllowed('production')).toThrow(
      'Mock users cannot be seeded in production',
    );
    expect(() => assertMockSeedingAllowed('development')).not.toThrow();
  });
});
