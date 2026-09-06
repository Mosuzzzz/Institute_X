import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ObjectStorage } from '../media/object-storage';

/**
 * Dependency checks are added here as infrastructure adapters are introduced.
 * PostgreSQL becomes the first required check with the Prisma task.
 */
@Injectable()
export class ReadinessIndicator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorage,
  ) {}

  async check(): Promise<boolean> {
    const [databaseReady, storageReady] = await Promise.all([
      this.prisma.isReady(),
      this.storage.isReady(),
    ]);
    return databaseReady && storageReady;
  }
}
