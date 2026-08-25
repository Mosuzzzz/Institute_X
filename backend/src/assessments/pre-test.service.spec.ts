import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AccountStatus, CourseVersionStatus, QuizResult, QuizType, UserRole } from '@prisma/client';
import { PreTestService } from './pre-test.service';

describe('PreTestService', () => {
  const db = {
    quizAttempt: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    quizAttemptAnswer: { createMany: jest.fn() },
  };
  const prisma = {
    quiz: { findUnique: jest.fn() },
    ...db,
    $transaction: jest.fn((operation: (tx: typeof db) => unknown) => operation(db)),
  };
  const randomizer = { shuffle: jest.fn(<T>(items: T[]) => [...items].reverse()) };
  const student = {
    id: 'student-id',
    role: UserRole.STUDENT,
    accountStatus: AccountStatus.ACTIVE,
    majorId: 'major-it',
  };
  let service: PreTestService;

  const quiz = {
    id: 'quiz-id',
    quizType: QuizType.PRE_TEST,
    durationSeconds: 600,
    randomizeQuestions: true,
    randomizeOptions: true,
    version: {
      status: CourseVersionStatus.PUBLISHED,
      course: {
        enrollments: [{ studentId: 'student-id' }],
        allowedMajors: [{ majorId: 'major-it' }],
      },
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
      {
        id: 'question-2',
        questionText: 'Question 2',
        points: 1,
        options: [
          { id: 'option-2a', optionText: 'A', isCorrect: false },
          { id: 'option-2b', optionText: 'B', isCorrect: true },
        ],
      },
    ],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    randomizer.shuffle.mockImplementation(<T>(items: T[]) => [...items].reverse());
    prisma.$transaction.mockImplementation((operation) => operation(db));
    service = new PreTestService(prisma as never, randomizer as never);
  });

  it('starts one attempt and persists randomized presentation order', async () => {
    prisma.quiz.findUnique.mockResolvedValue(quiz);
    db.quizAttempt.findFirst.mockResolvedValue(null);
    db.quizAttempt.create.mockResolvedValue({ id: 'attempt-id' });

    const result = await service.start(student, 'quiz-id');

    expect(db.quizAttempt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        quizId: 'quiz-id',
        studentId: 'student-id',
        expiresAt: expect.any(Date),
        presentedQuestions: {
          create: [
            { questionId: 'question-2', displayPosition: 1 },
            { questionId: 'question-1', displayPosition: 2 },
          ],
        },
      }),
    });
    expect(result.questions[0]).toEqual(
      expect.objectContaining({
        id: 'question-2',
        options: [
          { id: 'option-2b', optionText: 'B' },
          { id: 'option-2a', optionText: 'A' },
        ],
      }),
    );
    expect(JSON.stringify(result)).not.toContain('isCorrect');
  });

  it('prevents another attempt after a submitted Pre-Test', async () => {
    prisma.quiz.findUnique.mockResolvedValue(quiz);
    db.quizAttempt.findFirst.mockResolvedValue({ id: 'completed-attempt' });

    await expect(service.start(student, 'quiz-id')).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires enrollment in the published Course', async () => {
    prisma.quiz.findUnique.mockResolvedValue({
      ...quiz,
      version: {
        ...quiz.version,
        course: { enrollments: [], allowedMajors: [{ majorId: 'major-it' }] },
      },
    });

    await expect(service.start(student, 'quiz-id')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies a currently ineligible Student even when an Enrollment exists', async () => {
    prisma.quiz.findUnique.mockResolvedValue(quiz);

    await expect(
      service.start({ ...student, majorId: 'major-business' }, 'quiz-id'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.quizAttempt.create).not.toHaveBeenCalled();
  });

  it('grades submitted answers on the server and stores COMPLETED', async () => {
    db.quizAttempt.findUnique.mockResolvedValue({
      id: 'attempt-id',
      studentId: 'student-id',
      submittedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      quiz,
      presentedQuestions: quiz.questions.map((question) => ({ question })),
    });
    db.quizAttemptAnswer.createMany.mockResolvedValue({ count: 2 });
    db.quizAttempt.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.submit(student, 'attempt-id', [
      { questionId: 'question-1', optionId: 'option-1a' },
      { questionId: 'question-2', optionId: 'option-2a' },
    ]);

    expect(db.quizAttemptAnswer.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          questionId: 'question-1',
          selectedOptionId: 'option-1a',
          isCorrect: true,
          pointsAwarded: 1,
        }),
        expect.objectContaining({
          questionId: 'question-2',
          selectedOptionId: 'option-2a',
          isCorrect: false,
          pointsAwarded: 0,
        }),
      ]),
    });
    expect(db.quizAttempt.updateMany).toHaveBeenCalledWith({
      where: { id: 'attempt-id', submittedAt: null },
      data: expect.objectContaining({
        score: 50,
        result: QuizResult.COMPLETED,
      }),
    });
    expect(result).toEqual({ score: 50, result: QuizResult.COMPLETED });
  });

  it('rejects incomplete or duplicate answers', async () => {
    db.quizAttempt.findUnique.mockResolvedValue({
      id: 'attempt-id',
      studentId: 'student-id',
      submittedAt: null,
      expiresAt: null,
      quiz,
      presentedQuestions: quiz.questions.map((question) => ({ question })),
    });

    await expect(
      service.submit(student, 'attempt-id', [{ questionId: 'question-1', optionId: 'option-1a' }]),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects submission after the server deadline', async () => {
    db.quizAttempt.findUnique.mockResolvedValue({
      id: 'attempt-id',
      studentId: 'student-id',
      submittedAt: null,
      expiresAt: new Date(Date.now() - 1_000),
      quiz,
      presentedQuestions: quiz.questions.map((question) => ({ question })),
    });

    await expect(
      service.submit(student, 'attempt-id', [
        { questionId: 'question-1', optionId: 'option-1a' },
        { questionId: 'question-2', optionId: 'option-2b' },
      ]),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
