import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CourseVersionStatus, QuestionType, QuizType, UserRole } from '@prisma/client';
import { QuizAuthoringService } from './quiz-authoring.service';

describe('QuizAuthoringService', () => {
  const prisma = {
    courseVersion: { findUnique: jest.fn() },
    quiz: { create: jest.fn(), findUnique: jest.fn() },
    question: { create: jest.fn() },
  };
  let service: QuizAuthoringService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new QuizAuthoringService(prisma as never);
  });

  describe('createQuiz', () => {
    it('creates a randomized timed Pre-Test on an owned Draft', async () => {
      prisma.courseVersion.findUnique.mockResolvedValue({
        status: CourseVersionStatus.DRAFT,
        course: { teacherId: 'teacher-id' },
      });
      prisma.quiz.create.mockResolvedValue({ id: 'quiz-id' });

      await service.createQuiz({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id', {
        quizType: QuizType.PRE_TEST,
        title: 'Pre-Test',
        durationSeconds: 900,
      });

      expect(prisma.quiz.create).toHaveBeenCalledWith({
        data: {
          versionId: 'version-id',
          quizType: QuizType.PRE_TEST,
          title: 'Pre-Test',
          durationSeconds: 900,
          randomizeQuestions: true,
          randomizeOptions: true,
        },
      });
    });

    it('uses null duration for an untimed Quiz', async () => {
      prisma.courseVersion.findUnique.mockResolvedValue({
        status: CourseVersionStatus.DRAFT,
        course: { teacherId: 'teacher-id' },
      });
      prisma.quiz.create.mockResolvedValue({ id: 'quiz-id' });

      await service.createQuiz({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id', {
        quizType: QuizType.POST_TEST,
        title: 'Post-Test',
      });

      expect(prisma.quiz.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ durationSeconds: null }),
      });
    });

    it('rejects a non-positive timer', async () => {
      await expect(
        service.createQuiz({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id', {
          quizType: QuizType.PRE_TEST,
          title: 'Pre-Test',
          durationSeconds: 0,
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rejects a second Quiz of the same type', async () => {
      prisma.courseVersion.findUnique.mockResolvedValue({
        status: CourseVersionStatus.DRAFT,
        course: { teacherId: 'teacher-id' },
      });
      prisma.quiz.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.createQuiz({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id', {
          quizType: QuizType.PRE_TEST,
          title: 'Duplicate',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('denies changes to a Published Version', async () => {
      prisma.courseVersion.findUnique.mockResolvedValue({
        status: CourseVersionStatus.PUBLISHED,
        course: { teacherId: 'teacher-id' },
      });

      await expect(
        service.createQuiz({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id', {
          quizType: QuizType.POST_TEST,
          title: 'Post-Test',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('addQuestion', () => {
    const input = {
      questionText: 'Which protocol resolves an IP address to a MAC address?',
      points: 1,
      position: 1,
      options: [
        { optionText: 'ARP', isCorrect: true, position: 1 },
        { optionText: 'DNS', isCorrect: false, position: 2 },
      ],
    };

    it('atomically creates a Multiple Choice question and its options', async () => {
      prisma.quiz.findUnique.mockResolvedValue({
        version: {
          status: CourseVersionStatus.DRAFT,
          course: { teacherId: 'teacher-id' },
        },
      });
      prisma.question.create.mockResolvedValue({ id: 'question-id' });

      await service.addQuestion({ id: 'teacher-id', role: UserRole.TEACHER }, 'quiz-id', input);

      expect(prisma.question.create).toHaveBeenCalledWith({
        data: {
          quizId: 'quiz-id',
          questionText: input.questionText,
          questionType: QuestionType.MULTIPLE_CHOICE,
          points: input.points,
          position: input.position,
          options: { create: input.options },
        },
        include: { options: true },
      });
    });

    it('requires at least two answer options', async () => {
      await expect(
        service.addQuestion({ id: 'teacher-id', role: UserRole.TEACHER }, 'quiz-id', {
          ...input,
          options: [input.options[0]],
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('requires exactly one correct option', async () => {
      await expect(
        service.addQuestion({ id: 'teacher-id', role: UserRole.TEACHER }, 'quiz-id', {
          ...input,
          options: input.options.map((option) => ({
            ...option,
            isCorrect: false,
          })),
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('denies another Teacher', async () => {
      prisma.quiz.findUnique.mockResolvedValue({
        version: {
          status: CourseVersionStatus.DRAFT,
          course: { teacherId: 'owner-id' },
        },
      });

      await expect(
        service.addQuestion({ id: 'other-id', role: UserRole.TEACHER }, 'quiz-id', input),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
