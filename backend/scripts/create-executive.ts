import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.BOOTSTRAP_EXECUTIVE_EMAIL?.trim().toLowerCase();
  if (!email?.endsWith('@x.ac.th')) throw new Error('Set BOOTSTRAP_EXECUTIVE_EMAIL to an existing verified @x.ac.th account');
  const user = await prisma.user.findUnique({ where: { universityEmail: email } });
  if (!user?.emailVerifiedAt) throw new Error('The account must sign in and verify its email before bootstrap');
  await prisma.userRoleAssignment.createMany({
    data: [{ userId: user.id, role: UserRole.STUDENT }, { userId: user.id, role: UserRole.EXECUTIVE }],
    skipDuplicates: true,
  });
}

main().finally(() => prisma.$disconnect());
