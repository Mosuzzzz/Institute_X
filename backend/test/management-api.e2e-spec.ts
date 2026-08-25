import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AccountStatus, ContentType, UserRole } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import type { Server } from 'node:http';
import request from 'supertest';
import { AnalyticsModule } from '../src/analytics/analytics.module';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { MediaModule } from '../src/media/media.module';
import { MediaService } from '../src/media/media.service';

interface RequestWithUser extends Request {
  user?: { id: string; role: UserRole; accountStatus: AccountStatus };
}

describe('Management REST API', () => {
  let app: INestApplication;
  const analytics = {
    getTeacherCourseAnalytics: jest.fn(),
    getOwnerDashboard: jest.fn(),
  };
  const media = {
    initializeUpload: jest.fn(),
    completeUpload: jest.fn(),
    createStudentViewUrl: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      imports: [AnalyticsModule, MediaModule],
    })
      .overrideProvider(AnalyticsService)
      .useValue(analytics)
      .overrideProvider(MediaService)
      .useValue(media)
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
        req.user = { id: 'actor-id', role, accountStatus: AccountStatus.ACTIVE };
      }
      next();
    });
    await app.init();
  });

  afterEach(async () => app.close());

  it('GET /teacher/courses/:id/analytics returns owned Course statistics', async () => {
    analytics.getTeacherCourseAnalytics.mockResolvedValue({
      enrollments: 25,
      accesses: 100,
    });

    await request(app.getHttpServer() as Server)
      .get('/api/teacher/courses/11111111-1111-4111-8111-111111111111/analytics')
      .set('x-test-role', UserRole.TEACHER)
      .expect(200)
      .expect({ enrollments: 25, accesses: 100 });
  });

  it('GET /owner/dashboard is Owner-only', async () => {
    analytics.getOwnerDashboard.mockResolvedValue({ overview: { users: 100 } });

    await request(app.getHttpServer() as Server)
      .get('/api/owner/dashboard')
      .set('x-test-role', UserRole.OWNER)
      .expect(200)
      .expect({ overview: { users: 100 } });
    await request(app.getHttpServer() as Server)
      .get('/api/owner/dashboard')
      .set('x-test-role', UserRole.TEACHER)
      .expect(403);
  });

  it('POST /course-versions/:id/media/uploads initializes a private upload', async () => {
    media.initializeUpload.mockResolvedValue({
      assetId: 'asset-id',
      uploadUrl: 'https://storage.example/signed-upload',
      expiresAt: '2026-08-25T01:00:00.000Z',
    });

    await request(app.getHttpServer() as Server)
      .post('/api/course-versions/11111111-1111-4111-8111-111111111111/media/uploads')
      .set('x-test-role', UserRole.TEACHER)
      .send({
        contentType: ContentType.VIDEO,
        title: 'Lesson video',
        fileName: 'lesson.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 1_000,
        position: 1,
      })
      .expect(201)
      .expect({
        assetId: 'asset-id',
        uploadUrl: 'https://storage.example/signed-upload',
        expiresAt: '2026-08-25T01:00:00.000Z',
      });
  });

  it('rejects invalid upload metadata before the service', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/course-versions/11111111-1111-4111-8111-111111111111/media/uploads')
      .set('x-test-role', UserRole.TEACHER)
      .send({
        contentType: ContentType.TEXT,
        fileName: '',
        mimeType: 'bad',
        sizeBytes: 0,
        position: 0,
      })
      .expect(400);
    expect(media.initializeUpload).not.toHaveBeenCalled();
  });

  it('POST /media/:id/complete verifies a Teacher upload', async () => {
    media.completeUpload.mockResolvedValue({ id: 'asset-id', status: 'READY' });

    await request(app.getHttpServer() as Server)
      .post('/api/media/11111111-1111-4111-8111-111111111111/complete')
      .set('x-test-role', UserRole.TEACHER)
      .expect(200)
      .expect({ id: 'asset-id', status: 'READY' });
  });
});
