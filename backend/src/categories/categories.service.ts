import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Category, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

interface CategoryActor {
  id: string;
  role: UserRole;
}

interface CreateCategoryInput {
  slug: string;
  name: string;
}

interface UpdateCategoryInput {
  slug?: string;
  name?: string;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<Category[]> {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async create(actor: CategoryActor, input: CreateCategoryInput): Promise<Category> {
    this.requireOwner(actor);
    const name = input.name.trim();
    if (!name) {
      throw new UnprocessableEntityException('Category name is required');
    }

    try {
      return await this.prisma.category.create({
        data: { slug: input.slug, name },
      });
    } catch (error: unknown) {
      this.mapUniqueConflict(error);
      throw error;
    }
  }

  async update(
    actor: CategoryActor,
    categoryId: string,
    input: UpdateCategoryInput,
  ): Promise<Category> {
    this.requireOwner(actor);
    if (input.slug === undefined && input.name === undefined) {
      throw new UnprocessableEntityException('At least one Category field is required');
    }
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException('Category was not found');
    }

    const data: UpdateCategoryInput = {};
    if (input.slug !== undefined) {
      data.slug = input.slug;
    }
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        throw new UnprocessableEntityException('Category name is required');
      }
      data.name = name;
    }

    try {
      return await this.prisma.category.update({ where: { id: categoryId }, data });
    } catch (error: unknown) {
      this.mapUniqueConflict(error);
      throw error;
    }
  }

  private requireOwner(actor: CategoryActor): void {
    if (actor.role !== UserRole.OWNER) {
      throw new ForbiddenException('OWNER role is required');
    }
  }

  private mapUniqueConflict(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Category slug and name must be unique');
    }
  }
}
