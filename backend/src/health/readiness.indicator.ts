import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

/**
 * Dependency checks are added here as infrastructure adapters are introduced.
 * PostgreSQL becomes the first required check with the Prisma task.
 */
@Injectable()
export class ReadinessIndicator {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<boolean> {
    return this.prisma.isReady();
  }
}
