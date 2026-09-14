import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AccountStatus, QuizResult, UserRole } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import type { Server } from 'node:http';
import request from 'supertest';
import { AssessmentsModule } from '../src/assessments/assessments.module';
import { PostTestService } from '../src/assessments/post-test.service';
import { PreTestService } from '../src/assessments/pre-test.service';
import { CourseAccessService } from '../src/learning/course-access.service';
import { LearningModule } from '../src/learning/learning.module';
import { MediaModule } from '../src/media/media.module';
import { MediaService } from '../src/media/media.service';
import { PrismaService } from '../src/database/prisma.service';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    role: UserRole;
    accountStatus: AccountStatus;
    majorId: string;
  };
}

describe('Student REST API', () => {
  let app: INestApplication;
  const access = {
    enterCourse: jest.fn(),
    getPublishedContent: jest.fn(),
    listEligibleCourses: jest.fn(),
    completeLesson: jest.fn(),
  };
  const preTest = {
    start: jest.fn(),
    submit: jest.fn(),
    finalizeExpired: jest.fn(),
    getResult: jest.fn(),
  };
  const postTest = { start: jest.fn(), submit: jest.fn(), getResults: jest.fn() };
  const media = { createStudentViewUrl: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      imports: [LearningModule, AssessmentsModule, MediaModule],
    })
      .overrideProvider(CourseAccessService)
      .useValue(access)
      .overrideProvider(PreTestService)
      .useValue(preTest)
      .overrideProvider(PostTestService)
      .useValue(postTest)
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
        req.user = {
          id: 'student-id',
          role,
          accountStatus: AccountStatus.ACTIVE,
          majorId: '11111111-1111-4111-8111-111111111111',
        };
      }
      next();
    });
    await app.init();
  });

  afterEach(async () => app.close());

  it('records lesson completion through a Student-only endpoint', async () => {
    access.completeLesson.mockResolvedValue({ versionId: 'version-id', contentItems: [] });
    await request(app.getHttpServer() as Server)
      .post(
        '/api/courses/11111111-1111-4111-8111-111111111111/content/22222222-2222-4222-8222-222222222222/complete',
      )
      .set('x-test-role', 'STUDENT')
      .expect(201);
    expect(access.completeLesson).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'student-id' }),
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    );
  });

  it('rejects non-Student lesson completion', async () => {
    await request(app.getHttpServer() as Server)
      .post(
        '/api/courses/11111111-1111-4111-8111-111111111111/content/22222222-2222-4222-8222-222222222222/complete',
      )
      .set('x-test-role', 'TEACHER')
      .expect(403);
    expect(access.completeLesson).not.toHaveBeenCalled();
  });

  it('POST /courses/:id/enter enrolls and returns content lock state', async () => {
    access.enterCourse.mockResolvedValue({
      versionId: 'version-id',
      preTestId: 'pre-test-id',
      postTestId: 'post-test-id',
      contentUnlocked: false,
    });

    await request(app.getHttpServer() as Server)
      .post('/api/courses/11111111-1111-4111-8111-111111111111/enter')
      .set('x-test-role', UserRole.STUDENT)
      .expect(201)
      .expect({
        versionId: 'version-id',
        preTestId: 'pre-test-id',
        postTestId: 'post-test-id',
        contentUnlocked: false,
      });
  });

  it('GET /courses lists the Student eligible published catalog', async () => {
    access.listEligibleCourses.mockResolvedValue([
      {
        courseId: 'course-id',
        versionId: 'version-id',
        title: 'Network Fundamentals',
        enrollments: 25,
        enrolled: false,
      },
    ]);

    await request(app.getHttpServer() as Server)
      .get('/api/courses?categoryId=22222222-2222-4222-8222-222222222222')
      .set('x-test-role', UserRole.STUDENT)
      .expect(200)
      .expect([
        {
          courseId: 'course-id',
          versionId: 'version-id',
          title: 'Network Fundamentals',
          enrollments: 25,
          enrolled: false,
        },
      ]);

    expect(access.listEligibleCourses).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'student-id', role: UserRole.STUDENT }),
      '22222222-2222-4222-8222-222222222222',
    );
  });

  it('GET /courses/:id/content returns unlocked published learning content', async () => {
    access.getPublishedContent.mockResolvedValue({
      versionId: 'version-id',
      title: 'Network Fundamentals',
      contentItems: [],
    });

    await request(app.getHttpServer() as Server)
      .get('/api/courses/11111111-1111-4111-8111-111111111111/content')
      .set('x-test-role', UserRole.STUDENT)
      .expect(200)
      .expect({ versionId: 'version-id', title: 'Network Fundamentals', contentItems: [] });

    expect(access.getPublishedContent).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'student-id', role: UserRole.STUDENT }),
      '11111111-1111-4111-8111-111111111111',
    );
  });

  it('POST /pre-tests/:id/attempts starts a Pre-Test', async () => {
    preTest.start.mockResolvedValue({ attemptId: 'attempt-id', questions: [] });

    await request(app.getHttpServer() as Server)
      .post('/api/pre-tests/11111111-1111-4111-8111-111111111111/attempts')
      .set('x-test-role', UserRole.STUDENT)
      .expect(201)
      .expect({ attemptId: 'attempt-id', questions: [] });
  });

  it('POST /pre-test-attempts/:id/submit validates and submits answers', async () => {
    preTest.submit.mockResolvedValue({ score: 100, result: QuizResult.COMPLETED });

    await request(app.getHttpServer() as Server)
      .post('/api/pre-test-attempts/11111111-1111-4111-8111-111111111111/submit')
      .set('x-test-role', UserRole.STUDENT)
      .send({
        answers: [
          {
            questionId: '22222222-2222-4222-8222-222222222222',
            optionId: '33333333-3333-4333-8333-333333333333',
          },
        ],
      })
      .expect(200)
      .expect({ score: 100, result: QuizResult.COMPLETED });
  });

  it('POST /pre-test-attempts/:id/finalize-expired reaches the service without answers', async () => {
    preTest.finalizeExpired.mockResolvedValue({
      score: 0,
      result: QuizResult.COMPLETED,
      courseId: 'course-id',
    });

    await request(app.getHttpServer() as Server)
      .post('/api/pre-test-attempts/11111111-1111-4111-8111-111111111111/finalize-expired')
      .set('x-test-role', UserRole.STUDENT)
      .expect(200)
      .expect({ score: 0, result: QuizResult.COMPLETED, courseId: 'course-id' });

    expect(preTest.finalizeExpired).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'student-id', role: UserRole.STUDENT }),
      '11111111-1111-4111-8111-111111111111',
    );
    expect(preTest.submit).not.toHaveBeenCalled();
  });

  it('GET /pre-tests/:id/result returns the stored Student score', async () => {
    preTest.getResult.mockResolvedValue({
      id: 'attempt-id',
      score: 100,
      result: QuizResult.COMPLETED,
    });

    await request(app.getHttpServer() as Server)
      .get('/api/pre-tests/11111111-1111-4111-8111-111111111111/result')
      .set('x-test-role', UserRole.STUDENT)
      .expect(200)
      .expect({ id: 'attempt-id', score: 100, result: QuizResult.COMPLETED });
  });

  it('rejects malformed assessment answers before the service', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/pre-test-attempts/11111111-1111-4111-8111-111111111111/submit')
      .set('x-test-role', UserRole.STUDENT)
      .send({ answers: [{ questionId: 'bad', optionId: 'bad' }] })
      .expect(400);
    expect(preTest.submit).not.toHaveBeenCalled();
  });

  it('starts and submits an unlimited Post-Test attempt', async () => {
    postTest.start.mockResolvedValue({ attemptId: 'post-attempt', questions: [] });
    postTest.submit.mockResolvedValue({ score: 80, result: QuizResult.PASS });

    await request(app.getHttpServer() as Server)
      .post('/api/post-tests/11111111-1111-4111-8111-111111111111/attempts')
      .set('x-test-role', UserRole.STUDENT)
      .expect(201);
    await request(app.getHttpServer() as Server)
      .post('/api/post-test-attempts/22222222-2222-4222-8222-222222222222/submit')
      .set('x-test-role', UserRole.STUDENT)
      .send({
        answers: [
          {
            questionId: '33333333-3333-4333-8333-333333333333',
            optionId: '44444444-4444-4444-8444-444444444444',
          },
        ],
      })
      .expect(200)
      .expect({ score: 80, result: QuizResult.PASS });
  });

  it('GET /post-tests/:id/results returns Student-owned history', async () => {
    postTest.getResults.mockResolvedValue([
      { id: 'attempt-id', score: 80, result: QuizResult.PASS },
    ]);

    await request(app.getHttpServer() as Server)
      .get('/api/post-tests/11111111-1111-4111-8111-111111111111/results')
      .set('x-test-role', UserRole.STUDENT)
      .expect(200)
      .expect([{ id: 'attempt-id', score: 80, result: QuizResult.PASS }]);
  });

  it('GET /media/:id/view-url returns only a signed URL', async () => {
    media.createStudentViewUrl.mockResolvedValue({
      url: 'https://storage.example/signed',
      expiresAt: '2026-08-25T01:00:00.000Z',
    });

    await request(app.getHttpServer() as Server)
      .get('/api/media/11111111-1111-4111-8111-111111111111/view-url')
      .set('x-test-role', UserRole.STUDENT)
      .expect(200)
      .expect({
        url: 'https://storage.example/signed',
        expiresAt: '2026-08-25T01:00:00.000Z',
      });
  });

  it('denies Student endpoints to Teachers', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/courses/11111111-1111-4111-8111-111111111111/enter')
      .set('x-test-role', UserRole.TEACHER)
      .expect(403);
  });
});
