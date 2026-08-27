import { ConflictException, ForbiddenException } from '@nestjs/common';
import {
  AccountStatus,
  CourseVersionStatus,
  Prisma,
  QuizResult,
  QuizType,
  UserRole,
} from '@prisma/client';
import { PostTestService } from './post-test.service';

describe('PostTestService', () => {
  const db = {
    quizAttempt: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    quizAttemptAnswer: { createMany: jest.fn() },
  };
  const prisma = {
    quiz: { findUnique: jest.fn() },
    ...db,
    $transaction: jest.fn((operation: (tx: typeof db) => unknown) => operation(db)),
  };
  const randomizer = { shuffle: jest.fn(<T>(items: T[]) => [...items]) };
  const student = {
    id: 'student-id',
    role: UserRole.STUDENT,
    accountStatus: AccountStatus.ACTIVE,
    majorId: 'major-it',
  };
  let service: PostTestService;

  const postTest = {
    id: 'post-test-id',
    quizType: QuizType.POST_TEST,
    durationSeconds: null,
    randomizeQuestions: true,
    randomizeOptions: true,
    version: {
      status: CourseVersionStatus.PUBLISHED,
      course: {
        enrollments: [{ studentId: 'student-id' }],
        allowedMajors: [{ majorId: 'major-it' }],
      },
      quizzes: [
        {
          quizType: QuizType.PRE_TEST,
          attempts: [{ result: QuizResult.COMPLETED }],
        },
      ],
    },
    questions: [
      {
        id: 'question-1',
        questionText: 'Question 1',
        points: 1,
        options: [
          { id: 'option-1a', optionText: 'A', isCorrect: true },
          { id: 'option-1b', optionText: 'B', isCorrect: false },
        ],
      },
    ],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    randomizer.shuffle.mockImplementation(<T>(items: T[]) => [...items]);
    prisma.$transaction.mockImplementation((operation) => operation(db));
    service = new PostTestService(prisma as never, randomizer as never);
  });

  it('starts a new independent attempt after Pre-Test completion', async () => {
    prisma.quiz.findUnique.mockResolvedValue(postTest);
    db.quizAttempt.create.mockResolvedValue({ id: 'attempt-id' });

    const result = await service.start(student, 'post-test-id');

    expect(db.quizAttempt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        quizId: 'post-test-id',
        studentId: 'student-id',
      }),
    });
    expect(result.attemptId).toBe('attempt-id');
    expect(JSON.stringify(result)).not.toContain('isCorrect');
  });

  it('allows unlimited attempts without checking earlier Post-Test results', async () => {
    prisma.quiz.findUnique.mockResolvedValue(postTest);
    db.quizAttempt.create
      .mockResolvedValueOnce({ id: 'attempt-1' })
      .mockResolvedValueOnce({ id: 'attempt-2' });

    await expect(service.start(student, 'post-test-id')).resolves.toEqual(
      expect.objectContaining({ attemptId: 'attempt-1' }),
    );
    await expect(service.start(student, 'post-test-id')).resolves.toEqual(
      expect.objectContaining({ attemptId: 'attempt-2' }),
    );
    expect(db.quizAttempt.create).toHaveBeenCalledTimes(2);
  });

  it('denies Post-Test before Pre-Test completion', async () => {
    prisma.quiz.findUnique.mockResolvedValue({
      ...postTest,
      version: {
        ...postTest.version,
        quizzes: [{ quizType: QuizType.PRE_TEST, attempts: [] }],
      },
    });

    await expect(service.start(student, 'post-test-id')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies a currently ineligible Student even after Pre-Test completion', async () => {
    prisma.quiz.findUnique.mockResolvedValue(postTest);

    await expect(
      service.start({ ...student, majorId: 'major-business' }, 'post-test-id'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.quizAttempt.create).not.toHaveBeenCalled();
  });

  it.each([
    [80, QuizResult.PASS],
    [79, QuizResult.NOT_PASS],
  ])('stores score %s as %s', async (score, expectedResult) => {
    db.quizAttempt.findUnique.mockResolvedValue({
      id: 'attempt-id',
      studentId: 'student-id',
      submittedAt: null,
      expiresAt: null,
      quiz: { quizType: QuizType.POST_TEST },
      presentedQuestions: [
        {
          question: {
            id: 'question-1',
            points: score,
            options: [{ id: 'correct-option', isCorrect: true }],
          },
        },
        {
          question: {
            id: 'question-2',
            points: 100 - score,
            options: [{ id: 'incorrect-option', isCorrect: false }],
          },
        },
      ],
    });
    db.quizAttemptAnswer.createMany.mockResolvedValue({ count: 1 });
    db.quizAttempt.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.submit(student, 'attempt-id', [
      { questionId: 'question-1', optionId: 'correct-option' },
      { questionId: 'question-2', optionId: 'incorrect-option' },
    ]);

    expect(db.quizAttempt.updateMany).toHaveBeenCalledWith({
      where: { id: 'attempt-id', submittedAt: null },
      data: expect.objectContaining({ score, result: expectedResult }),
    });
    expect(result).toEqual({ score, result: expectedResult });
  });

  it('rejects a late timed submission', async () => {
    db.quizAttempt.findUnique.mockResolvedValue({
      id: 'attempt-id',
      studentId: 'student-id',
      submittedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      quiz: { quizType: QuizType.POST_TEST },
      presentedQuestions: [],
    });

    await expect(service.submit(student, 'attempt-id', [])).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('returns only the Student own submitted score history', async () => {
    prisma.quizAttempt.findMany.mockResolvedValue([
      {
        id: 'attempt-1',
        score: new Prisma.Decimal('80.5'),
        result: QuizResult.PASS,
        startedAt: new Date('2026-08-25T00:00:00.000Z'),
        submittedAt: new Date('2026-08-25T00:10:00.000Z'),
      },
      {
        id: 'attempt-2',
        score: new Prisma.Decimal('50'),
        result: QuizResult.NOT_PASS,
        startedAt: new Date('2026-08-24T00:00:00.000Z'),
        submittedAt: new Date('2026-08-24T00:10:00.000Z'),
      },
    ]);

    const result = await service.getResults(student, 'post-test-id');

    expect(prisma.quizAttempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          quizId: 'post-test-id',
          studentId: 'student-id',
          submittedAt: { not: null },
          quiz: {
            quizType: QuizType.POST_TEST,
            version: {
              status: CourseVersionStatus.PUBLISHED,
              course: {
                OR: [
                  { eligibilityMode: 'OPEN' },
                  {
                    eligibilityMode: 'LIMITED',
                    allowedMajors: { some: { majorId: 'major-it' } },
                  },
                ],
                enrollments: { some: { studentId: 'student-id' } },
              },
            },
          },
        }),
      }),
    );
    expect(result).toHaveLength(2);
    expect(result.map((attempt) => attempt.score)).toEqual([80.5, 50]);
  });
});
