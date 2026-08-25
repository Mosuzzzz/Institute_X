import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AccountStatus, CourseVersionStatus, UserRole } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import type { Server } from 'node:http';
import request from 'supertest';
import { CoursesModule } from '../src/courses/courses.module';
import { CoursesService } from '../src/courses/courses.service';
import { TeacherPermissionsModule } from '../src/teacher-permissions/teacher-permissions.module';
import { TeacherPermissionsService } from '../src/teacher-permissions/teacher-permissions.service';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    role: UserRole;
    accountStatus: AccountStatus;
  };
}

describe('Core REST API', () => {
  let app: INestApplication;
  const courses = {
    createCourse: jest.fn(),
    updateDraft: jest.fn(),
    createRevision: jest.fn(),
    listOwned: jest.fn(),
  };
  const permissions = { requestPermission: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      imports: [CoursesModule, TeacherPermissionsModule],
    })
      .overrideProvider(CoursesService)
      .useValue(courses)
      .overrideProvider(TeacherPermissionsService)
      .useValue(permissions)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.use((req: RequestWithUser, _res: Response, next: NextFunction) => {
      const role = req.header('x-test-role') as UserRole | undefined;
      if (role) {
        req.user = {
          id: role === UserRole.TEACHER ? 'teacher-id' : 'user-id',
          role,
          accountStatus: AccountStatus.ACTIVE,
        };
      }
      next();
    });
    await app.init();
  });

  afterEach(async () => app.close());

  it('POST /api/courses validates input and passes the authenticated Teacher', async () => {
    courses.createCourse.mockResolvedValue({ id: 'course-id' });

    await request(app.getHttpServer() as Server)
      .post('/api/courses')
      .set('x-test-role', UserRole.TEACHER)
      .send({
        title: 'Network Fundamentals',
        description: 'Introduction',
        majorIds: ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'],
      })
      .expect(201)
      .expect({ id: 'course-id' });

    expect(courses.createCourse).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'teacher-id', role: UserRole.TEACHER }),
      expect.objectContaining({ title: 'Network Fundamentals' }),
    );
  });

  it('POST /api/courses rejects malformed input before the service', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/courses')
      .set('x-test-role', UserRole.TEACHER)
      .send({ title: '', majorIds: ['not-a-uuid'], unexpected: true })
      .expect(400);

    expect(courses.createCourse).not.toHaveBeenCalled();
  });

  it('PATCH /api/course-versions/:id edits owned Draft metadata', async () => {
    courses.updateDraft.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Updated course',
      description: null,
    });

    await request(app.getHttpServer() as Server)
      .patch('/api/course-versions/11111111-1111-4111-8111-111111111111')
      .set('x-test-role', UserRole.TEACHER)
      .send({ title: 'Updated course', description: null })
      .expect(200)
      .expect({
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Updated course',
        description: null,
      });

    expect(courses.updateDraft).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'teacher-id', role: UserRole.TEACHER }),
      '11111111-1111-4111-8111-111111111111',
      { title: 'Updated course', description: null },
    );
  });

  it('POST /api/courses/:id/versions creates a new Draft revision', async () => {
    courses.createRevision.mockResolvedValue({
      id: 'version-id',
      versionNumber: 2,
      status: CourseVersionStatus.DRAFT,
    });

    await request(app.getHttpServer() as Server)
      .post('/api/courses/11111111-1111-4111-8111-111111111111/versions')
      .set('x-test-role', UserRole.TEACHER)
      .expect(201)
      .expect({ id: 'version-id', versionNumber: 2, status: CourseVersionStatus.DRAFT });

    expect(courses.createRevision).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'teacher-id', role: UserRole.TEACHER }),
      '11111111-1111-4111-8111-111111111111',
    );
  });

  it('GET /api/courses/mine returns the Teacher authoring workspace', async () => {
    courses.listOwned.mockResolvedValue([{ id: 'course-id', versions: [] }]);

    await request(app.getHttpServer() as Server)
      .get('/api/courses/mine')
      .set('x-test-role', UserRole.TEACHER)
      .expect(200)
      .expect([{ id: 'course-id', versions: [] }]);
  });

  it('POST /api/courses denies the wrong role', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/courses')
      .set('x-test-role', UserRole.STUDENT)
      .send({
        title: 'Network Fundamentals',
        majorIds: ['11111111-1111-4111-8111-111111111111'],
      })
      .expect(403);
  });

  it('POST /api/teacher-permissions creates a Teacher request', async () => {
    permissions.requestPermission.mockResolvedValue({
      id: 'request-id',
      status: 'PENDING',
    });

    await request(app.getHttpServer() as Server)
      .post('/api/teacher-permissions')
      .set('x-test-role', UserRole.TEACHER)
      .send({ requestMessage: 'I want to create courses.' })
      .expect(201)
      .expect({ id: 'request-id', status: 'PENDING' });

    expect(permissions.requestPermission).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'teacher-id', role: UserRole.TEACHER }),
      'I want to create courses.',
    );
  });

  it('protected routes reject missing authentication', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/teacher-permissions')
      .send({})
      .expect(401);
  });
});
