import { Injectable } from '@nestjs/common';

/**
 * Dependency checks are added here as infrastructure adapters are introduced.
 * PostgreSQL becomes the first required check with the Prisma task.
 */
@Injectable()
export class ReadinessIndicator {
  async check(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
