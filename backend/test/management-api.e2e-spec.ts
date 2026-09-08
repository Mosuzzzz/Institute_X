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
import { PrismaService } from '../src/database/prisma.service';

interface RequestWithUser extends Request {
  user?: { id: string; role: UserRole; accountStatus: AccountStatus };
}

describe('Management REST API', () => {
  let app: INestApplication;
  const analytics = {
    getTeacherCourseAnalytics: jest.fn(),
    getOwnerDashboard: jest.fn(),
    listOwnerUsers: jest.fn(),
    listOwnerActivity: jest.fn(),
  };
  const media = {
    initializeUpload: jest.fn(),
    initializeCoverUpload: jest.fn(),
    completeUpload: jest.fn(),
    completeCoverUpload: jest.fn(),
    createCoverViewUrl: jest.fn(),
    createStudentViewUrl: jest.fn(),
    createReviewViewUrl: jest.fn(),
    deleteDraftAsset: jest.fn(),
    deleteDraftCover: jest.fn(),
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
      .overrideProvider(PrismaService)
      .useValue({})
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

  it('GET /executive/dashboard is Owner-only', async () => {
    analytics.getOwnerDashboard.mockResolvedValue({ overview: { users: 100 } });

    await request(app.getHttpServer() as Server)
      .get('/api/executive/dashboard')
      .set('x-test-role', UserRole.EXECUTIVE)
      .expect(200)
      .expect({ overview: { users: 100 } });
    await request(app.getHttpServer() as Server)
      .get('/api/executive/dashboard')
      .set('x-test-role', UserRole.TEACHER)
      .expect(403);
  });

  it('GET /executive/users returns the Owner user directory', async () => {
    analytics.listOwnerUsers.mockResolvedValue([{ id: 'user-id', role: UserRole.STUDENT }]);
    await request(app.getHttpServer() as Server)
      .get('/api/executive/users')
      .set('x-test-role', UserRole.EXECUTIVE)
      .expect(200)
      .expect([{ id: 'user-id', role: UserRole.STUDENT }]);
  });

  it('GET /executive/activity returns recent operational events', async () => {
    analytics.listOwnerActivity.mockResolvedValue([{ id: 'event-id', type: 'COURSE_ACCESS' }]);
    await request(app.getHttpServer() as Server)
      .get('/api/executive/activity')
      .set('x-test-role', UserRole.EXECUTIVE)
      .expect(200)
      .expect([{ id: 'event-id', type: 'COURSE_ACCESS' }]);
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

  it('POST /course-versions/:id/cover/uploads initializes one private image cover', async () => {
    media.initializeCoverUpload.mockResolvedValue({
      assetId: 'cover-id',
      uploadUrl: 'https://storage.example/signed-cover-upload',
      expiresAt: '2026-08-27T01:00:00.000Z',
    });

    await request(app.getHttpServer() as Server)
      .post('/api/course-versions/11111111-1111-4111-8111-111111111111/cover/uploads')
      .set('x-test-role', UserRole.TEACHER)
      .send({
        fileName: 'cover.webp',
        mimeType: 'image/webp',
        sizeBytes: 250_000,
      })
      .expect(201)
      .expect({
        assetId: 'cover-id',
        uploadUrl: 'https://storage.example/signed-cover-upload',
        expiresAt: '2026-08-27T01:00:00.000Z',
      });
  });

  it('POST /media/:id/complete verifies a Teacher upload', async () => {
    media.completeUpload.mockResolvedValue({ id: 'asset-id', status: 'READY' });

    await request(app.getHttpServer() as Server)
      .post('/api/media/11111111-1111-4111-8111-111111111111/complete')
      .set('x-test-role', UserRole.TEACHER)
      .expect(200)
      .expect({ id: 'asset-id', status: 'READY' });
  });

  it('GET /media/:id/review-url gives an Approver a submitted lesson preview', async () => {
    media.createReviewViewUrl.mockResolvedValue({
      url: 'https://storage.example/signed-review-preview',
      expiresAt: '2026-08-27T01:00:00.000Z',
    });

    await request(app.getHttpServer() as Server)
      .get('/api/media/11111111-1111-4111-8111-111111111111/review-url')
      .set('x-test-role', UserRole.APPROVER)
      .expect(200)
      .expect({
        url: 'https://storage.example/signed-review-preview',
        expiresAt: '2026-08-27T01:00:00.000Z',
      });

    await request(app.getHttpServer() as Server)
      .get('/api/media/11111111-1111-4111-8111-111111111111/review-url')
      .set('x-test-role', UserRole.TEACHER)
      .expect(403);
  });

  it('DELETE /media/:id removes an owned Draft asset', async () => {
    media.deleteDraftAsset.mockResolvedValue(undefined);

    await request(app.getHttpServer() as Server)
      .delete('/api/media/11111111-1111-4111-8111-111111111111')
      .set('x-test-role', UserRole.TEACHER)
      .expect(204);
  });
});
