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
import { CoursesModule } from '../src/courses/courses.module';
import { CoursesService } from '../src/courses/courses.service';
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
  const permissions = {
    requestPermission: jest.fn(),
    review: jest.fn(),
    getMyLatest: jest.fn(),
    listPending: jest.fn(),
  };
  const content = { addText: jest.fn(), updateText: jest.fn(), deleteText: jest.fn() };
  const versions = {
    submit: jest.fn(),
    review: jest.fn(),
    reopenRejected: jest.fn(),
    discardDraft: jest.fn(),
    listSubmitted: jest.fn(),
  };
  const courses = {
    listPublishedForOwner: jest.fn(),
    archiveCourse: jest.fn(),
  };
  const quizzes = { createQuiz: jest.fn(), addQuestion: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      imports: [
        TeacherPermissionsModule,
        ContentModule,
        CourseVersionsModule,
        CoursesModule,
        QuizzesModule,
      ],
    })
      .overrideProvider(TeacherPermissionsService)
      .useValue(permissions)
      .overrideProvider(ContentService)
      .useValue(content)
      .overrideProvider(CourseVersionsService)
      .useValue(versions)
      .overrideProvider(CoursesService)
      .useValue(courses)
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

  it('GET /teacher-permissions/me returns the Teacher latest state', async () => {
    permissions.getMyLatest.mockResolvedValue({
      id: 'request-id',
      status: 'PENDING',
    });

    await request(app.getHttpServer() as Server)
      .get('/api/teacher-permissions/me')
      .set('x-test-role', UserRole.TEACHER)
      .expect(200)
      .expect({ id: 'request-id', status: 'PENDING' });
  });

  it('GET /teacher-permissions/pending returns the Approver queue', async () => {
    permissions.listPending.mockResolvedValue([{ id: 'request-id', status: 'PENDING' }]);

    await request(app.getHttpServer() as Server)
      .get('/api/teacher-permissions/pending')
      .set('x-test-role', UserRole.APPROVER)
      .expect(200)
      .expect([{ id: 'request-id', status: 'PENDING' }]);
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

  it('PATCH /content/:id/text updates owned Draft text content', async () => {
    content.updateText.mockResolvedValue({ id: 'content-id', position: 2 });

    await request(app.getHttpServer() as Server)
      .patch('/api/content/11111111-1111-4111-8111-111111111111/text')
      .set('x-test-role', UserRole.TEACHER)
      .send({ textBody: 'Updated lesson', position: 2 })
      .expect(200)
      .expect({ id: 'content-id', position: 2 });
  });

  it('DELETE /content/:id/text removes owned Draft text content', async () => {
    content.deleteText.mockResolvedValue(undefined);

    await request(app.getHttpServer() as Server)
      .delete('/api/content/11111111-1111-4111-8111-111111111111/text')
      .set('x-test-role', UserRole.TEACHER)
      .expect(204);
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

  it('DELETE /course-versions/:id discards an owned Draft', async () => {
    versions.discardDraft.mockResolvedValue(undefined);

    await request(app.getHttpServer() as Server)
      .delete('/api/course-versions/11111111-1111-4111-8111-111111111111')
      .set('x-test-role', UserRole.TEACHER)
      .expect(204);

    expect(versions.discardDraft).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'actor-id', role: UserRole.TEACHER }),
      '11111111-1111-4111-8111-111111111111',
    );
  });

  it('GET /course-versions/pending-review returns the Approver queue', async () => {
    versions.listSubmitted.mockResolvedValue([{ id: 'version-id', status: 'SUBMITTED' }]);

    await request(app.getHttpServer() as Server)
      .get('/api/course-versions/pending-review')
      .set('x-test-role', UserRole.APPROVER)
      .expect(200)
      .expect([{ id: 'version-id', status: 'SUBMITTED' }]);
  });

  it('GET /courses/executive/catalog returns the Owner moderation catalog', async () => {
    courses.listPublishedForOwner.mockResolvedValue([{ courseId: 'course-id' }]);

    await request(app.getHttpServer() as Server)
      .get('/api/courses/executive/catalog')
      .set('x-test-role', UserRole.EXECUTIVE)
      .expect(200)
      .expect([{ courseId: 'course-id' }]);

    expect(courses.listPublishedForOwner).toHaveBeenCalledWith(
      expect.objectContaining({ role: UserRole.EXECUTIVE }),
    );
  });

  it('does not expose Owner Course moderation to an Approver', async () => {
    await request(app.getHttpServer() as Server)
      .get('/api/courses/executive/catalog')
      .set('x-test-role', UserRole.APPROVER)
      .expect(403);

    expect(courses.listPublishedForOwner).not.toHaveBeenCalled();
  });

  it('DELETE /courses/:id archives a Course for an Owner only', async () => {
    courses.archiveCourse.mockResolvedValue(undefined);
    const path = '/api/courses/11111111-1111-4111-8111-111111111111';

    await request(app.getHttpServer() as Server)
      .delete(path)
      .set('x-test-role', UserRole.APPROVER)
      .expect(403);
    await request(app.getHttpServer() as Server)
      .delete(path)
      .set('x-test-role', UserRole.EXECUTIVE)
      .expect(204);

    expect(courses.archiveCourse).toHaveBeenCalledTimes(1);
    expect(courses.archiveCourse).toHaveBeenCalledWith(
      expect.objectContaining({ role: UserRole.EXECUTIVE }),
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
