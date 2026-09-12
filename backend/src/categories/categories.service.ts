import { Injectable } from '@nestjs/common';
import { Category, Major } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<Category[]> {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  listMajors(): Promise<Major[]> {
    return this.prisma.major.findMany({ orderBy: { code: 'asc' } });
  }
}
