import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AccountStatus, UserRole } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import type { Server } from 'node:http';
import request from 'supertest';
import { CategoriesModule } from '../src/categories/categories.module';
import { CategoriesService } from '../src/categories/categories.service';
import { PrismaService } from '../src/database/prisma.service';

interface RequestWithUser extends Request {
  user?: { id: string; role: UserRole; accountStatus: AccountStatus };
}

describe('Categories REST API', () => {
  let app: INestApplication;
  const categories = { list: jest.fn(), create: jest.fn(), update: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({ imports: [CategoriesModule] })
      .overrideProvider(CategoriesService)
      .useValue(categories)
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    app.use((req: RequestWithUser, _res: Response, next: NextFunction) => {
      const role = req.header('x-test-role') as UserRole | undefined;
      if (role) {
        req.user = { id: 'user-id', role, accountStatus: AccountStatus.ACTIVE };
      }
      next();
    });
    await app.init();
  });

  afterEach(async () => app.close());

  it('GET /api/categories lists categories for an authenticated user', async () => {
    categories.list.mockResolvedValue([
      { id: '11111111-1111-4111-8111-111111111111', slug: 'technology', name: 'Technology' },
    ]);

    await request(app.getHttpServer() as Server)
      .get('/api/categories')
      .set('x-test-role', UserRole.STUDENT)
      .expect(200)
      .expect([
        { id: '11111111-1111-4111-8111-111111111111', slug: 'technology', name: 'Technology' },
      ]);
  });

  it('POST /api/categories allows an Owner to create a category', async () => {
    categories.create.mockResolvedValue({ id: 'category-id', slug: 'technology' });

    await request(app.getHttpServer() as Server)
      .post('/api/categories')
      .set('x-test-role', UserRole.OWNER)
      .send({ slug: 'technology', name: 'Technology' })
      .expect(201)
      .expect({ id: 'category-id', slug: 'technology' });

    expect(categories.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: UserRole.OWNER }),
      { slug: 'technology', name: 'Technology' },
    );
  });

  it('POST /api/categories rejects invalid slugs before the service', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/categories')
      .set('x-test-role', UserRole.OWNER)
      .send({ slug: 'Not Valid', name: '' })
      .expect(400);

    expect(categories.create).not.toHaveBeenCalled();
  });
});
