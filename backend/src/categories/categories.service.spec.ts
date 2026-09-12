import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  const categories = { findMany: jest.fn() };
  const majors = { findMany: jest.fn() };
  const service = new CategoriesService({ category: categories, major: majors } as never);
  beforeEach(() => jest.resetAllMocks());

  it('lists categories alphabetically', async () => {
    categories.findMany.mockResolvedValue([{ id: 'category', slug: 'technology' }]);
    await expect(service.list()).resolves.toEqual([{ id: 'category', slug: 'technology' }]);
    expect(categories.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
  });

  it('lists majors by code', async () => {
    majors.findMany.mockResolvedValue([]);
    await service.listMajors();
    expect(majors.findMany).toHaveBeenCalledWith({ orderBy: { code: 'asc' } });
  });

  it('does not provide obsolete Executive taxonomy mutations', () => {
    expect(service).not.toHaveProperty('create');
    expect(service).not.toHaveProperty('update');
  });
});
