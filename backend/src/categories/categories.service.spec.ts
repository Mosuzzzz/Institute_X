import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  const categories = {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  let service: CategoriesService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CategoriesService({ category: categories } as never);
  });

  it('lists categories alphabetically', async () => {
    categories.findMany.mockResolvedValue([{ id: 'category-id', slug: 'technology' }]);

    await expect(service.list()).resolves.toEqual([{ id: 'category-id', slug: 'technology' }]);
    expect(categories.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
  });

  it('allows an Owner to create a category', async () => {
    categories.create.mockResolvedValue({ id: 'category-id', slug: 'technology' });

    await service.create(
      { id: 'owner-id', role: UserRole.OWNER },
      { slug: 'technology', name: ' Technology ' },
    );

    expect(categories.create).toHaveBeenCalledWith({
      data: { slug: 'technology', name: 'Technology' },
    });
  });

  it('denies category creation to non-Owners', async () => {
    await expect(
      service.create(
        { id: 'teacher-id', role: UserRole.TEACHER },
        { slug: 'technology', name: 'Technology' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('maps duplicate slugs or names to conflict', async () => {
    categories.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.create(
        { id: 'owner-id', role: UserRole.OWNER },
        { slug: 'technology', name: 'Technology' },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns not found when updating an unknown category', async () => {
    categories.findUnique.mockResolvedValue(null);

    await expect(
      service.update({ id: 'owner-id', role: UserRole.OWNER }, 'category-id', { name: 'Updated' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
