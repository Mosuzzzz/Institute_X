import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AccountStatus, UserRole } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import type { Server } from 'node:http';
import request from 'supertest';
import { ContentModule } from '../src/content/content.module';
import { ContentService } from '../src/content/content.service';
import { CourseVersionsModule } from '../src/course-versions/course-versions.module';
import { CourseVersionsService } from '../src/course-versions/course-versions.service';
import { QuizzesModule } from '../src/quizzes/quizzes.module';
import { QuizAuthoringService } from '../src/quizzes/quiz-authoring.service';
import { TeacherPermissionsModule } from '../src/teacher-permissions/teacher-permissions.module';
import { TeacherPermissionsService } from '../src/teacher-permissions/teacher-permissions.service';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    role: UserRole;
    accountStatus: AccountStatus;
  };
}

describe('Authoring REST API', () => {
  let app: INestApplication;
  const permissions = { requestPermission: jest.fn(), review: jest.fn() };
  const content = { addText: jest.fn() };
  const versions = { submit: jest.fn(), review: jest.fn(), reopenRejected: jest.fn() };
  const quizzes = { createQuiz: jest.fn(), addQuestion: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      imports: [TeacherPermissionsModule, ContentModule, CourseVersionsModule, QuizzesModule],
    })
      .overrideProvider(TeacherPermissionsService)
      .useValue(permissions)
      .overrideProvider(ContentService)
      .useValue(content)
      .overrideProvider(CourseVersionsService)
      .useValue(versions)
      .overrideProvider(QuizAuthoringService)
      .useValue(quizzes)
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

  it('PATCH /teacher-permissions/:id/review forwards an Approver rejection', async () => {
    permissions.review.mockResolvedValue(undefined);

    await request(app.getHttpServer() as Server)
      .patch('/api/teacher-permissions/11111111-1111-4111-8111-111111111111/review')
      .set('x-test-role', UserRole.APPROVER)
      .send({ decision: 'REJECTED', comment: 'Please provide more information.' })
      .expect(204);

    expect(permissions.review).toHaveBeenCalledWith(
      expect.objectContaining({ role: UserRole.APPROVER }),
      '11111111-1111-4111-8111-111111111111',
      'REJECTED',
      'Please provide more information.',
    );
  });

  it('POST /course-versions/:id/content/text creates ordered text content', async () => {
    content.addText.mockResolvedValue({ id: 'content-id' });

    await request(app.getHttpServer() as Server)
      .post('/api/course-versions/11111111-1111-4111-8111-111111111111/content/text')
      .set('x-test-role', UserRole.TEACHER)
      .send({ title: 'Lesson 1', textBody: 'Introduction', position: 1 })
      .expect(201)
      .expect({ id: 'content-id' });
  });

  it('rejects a non-positive content position', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/course-versions/11111111-1111-4111-8111-111111111111/content/text')
      .set('x-test-role', UserRole.TEACHER)
      .send({ textBody: 'Introduction', position: 0 })
      .expect(400);
    expect(content.addText).not.toHaveBeenCalled();
  });

  it('POST /course-versions/:id/submit submits an owned Draft', async () => {
    versions.submit.mockResolvedValue(undefined);

    await request(app.getHttpServer() as Server)
      .post('/api/course-versions/11111111-1111-4111-8111-111111111111/submit')
      .set('x-test-role', UserRole.TEACHER)
      .send()
      .expect(204);
  });

  it('PATCH /course-versions/:id/review approves and publishes', async () => {
    versions.review.mockResolvedValue(undefined);

    await request(app.getHttpServer() as Server)
      .patch('/api/course-versions/11111111-1111-4111-8111-111111111111/review')
      .set('x-test-role', UserRole.APPROVER)
      .send({ decision: 'APPROVED' })
      .expect(204);
  });

  it('POST /course-versions/:id/reopen returns a rejected Version to Draft', async () => {
    versions.reopenRejected.mockResolvedValue(undefined);

    await request(app.getHttpServer() as Server)
      .post('/api/course-versions/11111111-1111-4111-8111-111111111111/reopen')
      .set('x-test-role', UserRole.TEACHER)
      .expect(204);

    expect(versions.reopenRejected).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'actor-id', role: UserRole.TEACHER }),
      '11111111-1111-4111-8111-111111111111',
    );
  });

  it('POST /course-versions/:id/quizzes creates a timed Pre-Test', async () => {
    quizzes.createQuiz.mockResolvedValue({ id: 'quiz-id' });

    await request(app.getHttpServer() as Server)
      .post('/api/course-versions/11111111-1111-4111-8111-111111111111/quizzes')
      .set('x-test-role', UserRole.TEACHER)
      .send({ quizType: 'PRE_TEST', title: 'Pre-Test', durationSeconds: 600 })
      .expect(201)
      .expect({ id: 'quiz-id' });
  });

  it('POST /quizzes/:id/questions creates validated options', async () => {
    quizzes.addQuestion.mockResolvedValue({ id: 'question-id' });

    await request(app.getHttpServer() as Server)
      .post('/api/quizzes/11111111-1111-4111-8111-111111111111/questions')
      .set('x-test-role', UserRole.TEACHER)
      .send({
        questionText: 'Which protocol resolves IP to MAC?',
        points: 1,
        position: 1,
        options: [
          { optionText: 'ARP', isCorrect: true, position: 1 },
          { optionText: 'DNS', isCorrect: false, position: 2 },
        ],
      })
      .expect(201)
      .expect({ id: 'question-id' });
  });
});
