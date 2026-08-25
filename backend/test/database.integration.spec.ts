import {
  AccountStatus,
  CourseVersionStatus,
  ContentType,
  Prisma,
  PrismaClient,
  QuizType,
  ReviewDecision,
  UserRole,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { CourseAccessService } from '../src/learning/course-access.service';
import { CourseVersionsService } from '../src/course-versions/course-versions.service';

const describeDatabase =
  process.env.RUN_DATABASE_INTEGRATION === 'true' ? describe : describe.skip;

describeDatabase('PostgreSQL integration', () => {
  const prisma = new PrismaClient();
  const majorId = randomUUID();
  const teacherId = randomUUID();
  const studentId = randomUUID();
  const approverId = randomUUID();
  const courseId = randomUUID();
  const versionId = randomUUID();
  const quizId = randomUUID();
  const marker = randomUUID();
  const service = new CourseAccessService(prisma as never);
  const versions = new CourseVersionsService(prisma as never);

  beforeAll(async () => {
    await prisma.major.create({
      data: { id: majorId, code: `IT-${marker}`, name: `Integration Major ${marker}` },
    });
    await prisma.user.createMany({
      data: [
        {
          id: teacherId,
          ssoSubject: `teacher-${marker}`,
          username: `teacher-${marker}`,
          universityEmail: `teacher-${marker}@institute.example`,
          fullName: 'Integration Teacher',
          role: UserRole.TEACHER,
          accountStatus: AccountStatus.ACTIVE,
        },
        {
          id: studentId,
          ssoSubject: `student-${marker}`,
          username: `student-${marker}`,
          universityEmail: `student-${marker}@institute.example`,
          fullName: 'Integration Student',
          role: UserRole.STUDENT,
          accountStatus: AccountStatus.ACTIVE,
          majorId,
        },
        {
          id: approverId,
          ssoSubject: `approver-${marker}`,
          username: `approver-${marker}`,
          universityEmail: `approver-${marker}@institute.example`,
          fullName: 'Integration Approver',
          role: UserRole.APPROVER,
          accountStatus: AccountStatus.ACTIVE,
        },
      ],
    });
    await prisma.course.create({
      data: {
        id: courseId,
        teacherId,
        allowedMajors: { create: { majorId } },
        versions: {
          create: {
            id: versionId,
            versionNumber: 1,
            title: 'Integration Course',
            status: CourseVersionStatus.PUBLISHED,
            publishedAt: new Date(),
            quizzes: {
              create: {
                id: quizId,
                quizType: QuizType.PRE_TEST,
                title: 'Pre-Test',
              },
            },
          },
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.teacherPermissionRequest.deleteMany({ where: { teacherId } });
    await prisma.courseVersionReview.deleteMany({ where: { version: { courseId } } });
    await prisma.courseAccessEvent.deleteMany({ where: { courseId } });
    await prisma.courseEnrollment.deleteMany({ where: { courseId } });
    await prisma.courseVersion.deleteMany({ where: { courseId } });
    await prisma.courseAllowedMajor.deleteMany({ where: { courseId } });
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.user.deleteMany({
      where: { id: { in: [studentId, teacherId, approverId] } },
    });
    await prisma.major.deleteMany({ where: { id: majorId } });
    await prisma.$disconnect();
  });

  it('keeps one Enrollment while recording every eligible Course entry', async () => {
    const actor = {
      id: studentId,
      role: UserRole.STUDENT,
      accountStatus: AccountStatus.ACTIVE,
      majorId,
    };

    await service.enterCourse(actor, courseId);
    await service.enterCourse(actor, courseId);

    await expect(
      prisma.courseEnrollment.count({ where: { courseId, studentId } }),
    ).resolves.toBe(1);
    await expect(
      prisma.courseAccessEvent.count({ where: { courseId, studentId } }),
    ).resolves.toBe(2);
  });

  it('enforces the database unique Enrollment invariant', async () => {
    await expect(
      prisma.courseEnrollment.create({ data: { courseId, studentId } }),
    ).rejects.toMatchObject<Partial<Prisma.PrismaClientKnownRequestError>>({ code: 'P2002' });
  });

  it('enforces one published Version and one active revision per Course', async () => {
    await expect(
      prisma.courseVersion.create({
        data: {
          courseId,
          versionNumber: 2,
          title: 'Second Published Version',
          status: CourseVersionStatus.PUBLISHED,
        },
      }),
    ).rejects.toMatchObject<Partial<Prisma.PrismaClientKnownRequestError>>({ code: 'P2002' });

    await prisma.courseVersion.create({
      data: {
        courseId,
        versionNumber: 2,
        title: 'Draft Revision',
        status: CourseVersionStatus.DRAFT,
      },
    });
    await expect(
      prisma.courseVersion.create({
        data: {
          courseId,
          versionNumber: 3,
          title: 'Concurrent Draft Revision',
          status: CourseVersionStatus.DRAFT,
        },
      }),
    ).rejects.toMatchObject<Partial<Prisma.PrismaClientKnownRequestError>>({ code: 'P2002' });
  });

  it('enforces one pending permission request per Teacher', async () => {
    await prisma.teacherPermissionRequest.create({ data: { teacherId } });

    await expect(
      prisma.teacherPermissionRequest.create({ data: { teacherId } }),
    ).rejects.toMatchObject<Partial<Prisma.PrismaClientKnownRequestError>>({ code: 'P2002' });
  });

  it('submits a complete Draft and atomically replaces the published Version', async () => {
    const draft = await prisma.courseVersion.findFirstOrThrow({
      where: { courseId, status: CourseVersionStatus.DRAFT },
    });
    await prisma.contentItem.create({
      data: {
        versionId: draft.id,
        contentType: ContentType.TEXT,
        textBody: 'Integration lesson',
        position: 1,
      },
    });
    await prisma.quiz.create({
      data: {
        versionId: draft.id,
        quizType: QuizType.PRE_TEST,
        title: 'Integration Pre-Test',
        questions: {
          create: {
            questionText: 'Integration question',
            points: 1,
            position: 1,
            options: {
              create: [
                { optionText: 'Correct', isCorrect: true, position: 1 },
                { optionText: 'Incorrect', isCorrect: false, position: 2 },
              ],
            },
          },
        },
      },
    });

    await versions.submit({ id: teacherId, role: UserRole.TEACHER }, draft.id);
    await versions.review(
      { id: approverId, role: UserRole.APPROVER },
      draft.id,
      ReviewDecision.APPROVED,
    );

    await expect(
      prisma.courseVersion.findUniqueOrThrow({ where: { id: draft.id } }),
    ).resolves.toMatchObject({ status: CourseVersionStatus.PUBLISHED });
    await expect(
      prisma.courseVersion.findUniqueOrThrow({ where: { id: versionId } }),
    ).resolves.toMatchObject({ status: CourseVersionStatus.SUPERSEDED });
    await expect(
      prisma.courseVersionReview.count({
        where: { versionId: draft.id, decision: ReviewDecision.APPROVED },
      }),
    ).resolves.toBe(1);
  });
});
