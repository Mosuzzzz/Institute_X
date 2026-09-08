import { AccountStatus, PrismaClient, UserRole } from '@prisma/client';
import { PasswordHasher } from '../src/auth/password-hasher';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.BOOTSTRAP_EXECUTIVE_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_EXECUTIVE_PASSWORD;
  const username = process.env.BOOTSTRAP_EXECUTIVE_USERNAME?.trim();
  const fullName = process.env.BOOTSTRAP_EXECUTIVE_NAME?.trim();
  if (!email || !password || password.length < 12 || !username || !fullName) {
    throw new Error(
      'Set BOOTSTRAP_EXECUTIVE_EMAIL, BOOTSTRAP_EXECUTIVE_PASSWORD (12+ chars), BOOTSTRAP_EXECUTIVE_USERNAME, and BOOTSTRAP_EXECUTIVE_NAME',
    );
  }
  const passwordHash = await new PasswordHasher().hash(password);
  const user = await prisma.user.upsert({
    where: { universityEmail: email },
    create: {
      universityEmail: email,
      username,
      fullName,
      passwordHash,
      accountStatus: AccountStatus.ACTIVE,
    },
    update: {
      username,
      fullName,
      passwordHash,
      accountStatus: AccountStatus.ACTIVE,
    },
  });
  await prisma.userRoleAssignment.upsert({
    where: { userId_role: { userId: user.id, role: UserRole.EXECUTIVE } },
    create: { userId: user.id, role: UserRole.EXECUTIVE },
    update: {},
  });
}

main().finally(() => prisma.$disconnect());
