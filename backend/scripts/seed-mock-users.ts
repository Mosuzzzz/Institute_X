import { PrismaService } from '../src/database/prisma.service';
import {
  assertMockSeedingAllowed,
  seedMockUsers,
} from '../src/dev/mock-users.seed';

const prisma = new PrismaService();

async function main(): Promise<void> {
  assertMockSeedingAllowed(process.env.NODE_ENV);
  const users = await seedMockUsers(prisma);
  for (const user of users) {
    process.stdout.write(`${user.email} [${user.roles.join(', ')}]\n`);
  }
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
