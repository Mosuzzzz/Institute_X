import { AccountStatus, PrismaClient, UserRole } from '@prisma/client';
import { PasswordHasher } from '../src/auth/password-hasher';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.BOOTSTRAP_REGISTRAR_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_REGISTRAR_PASSWORD;
  const username = process.env.BOOTSTRAP_REGISTRAR_USERNAME?.trim();
  const fullName = process.env.BOOTSTRAP_REGISTRAR_NAME?.trim();
  if (!email || !password || password.length < 12 || !username || !fullName) {
    throw new Error(
      'Set BOOTSTRAP_REGISTRAR_EMAIL, BOOTSTRAP_REGISTRAR_PASSWORD (12+ chars), BOOTSTRAP_REGISTRAR_USERNAME, and BOOTSTRAP_REGISTRAR_NAME',
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
    update: { username, fullName, passwordHash, accountStatus: AccountStatus.ACTIVE },
  });
  await prisma.userRoleAssignment.createMany({
    data: [
      { userId: user.id, role: UserRole.STUDENT },
      { userId: user.id, role: UserRole.REGISTRAR },
    ],
    skipDuplicates: true,
  });
}

main().finally(() => prisma.$disconnect());
