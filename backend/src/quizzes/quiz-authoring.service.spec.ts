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
    quiz: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    question: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const storage = { deleteObject: jest.fn() };
  let service: QuizAuthoringService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new QuizAuthoringService(prisma as never, storage as never);
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

  describe('updateQuiz', () => {
    it('updates an owned Draft Quiz title and duration', async () => {
      prisma.quiz.findUnique.mockResolvedValue({
        version: {
          status: CourseVersionStatus.DRAFT,
          course: { teacherId: 'teacher-id' },
        },
      });
      prisma.quiz.update.mockResolvedValue({ id: 'quiz-id' });

      await service.updateQuiz(
        { id: 'teacher-id', role: UserRole.TEACHER },
        'quiz-id',
        { title: 'Updated Pre-test', durationSeconds: 1200 },
      );

      expect(prisma.quiz.update).toHaveBeenCalledWith({
        where: { id: 'quiz-id' },
        data: { title: 'Updated Pre-test', durationSeconds: 1200 },
      });
    });
  });

  describe('updateQuestion', () => {
    it('atomically replaces an owned Draft question and its answer options', async () => {
      const input = {
        questionText: 'Updated question?',
        points: 2,
        position: 1,
        options: [
          { optionText: 'Correct', isCorrect: true, position: 1 },
          { optionText: 'Wrong', isCorrect: false, position: 2 },
        ],
      };
      prisma.question.findUnique.mockResolvedValue({
        quiz: {
          version: {
            status: CourseVersionStatus.DRAFT,
            course: { teacherId: 'teacher-id' },
          },
        },
      });
      prisma.question.update.mockResolvedValue({ id: 'question-id', options: input.options });

      await service.updateQuestion(
        { id: 'teacher-id', role: UserRole.TEACHER },
        'question-id',
        input,
      );

      expect(prisma.question.update).toHaveBeenCalledWith({
        where: { id: 'question-id' },
        data: {
          questionText: 'Updated question?',
          questionType: QuestionType.MULTIPLE_CHOICE,
          points: 2,
          position: 1,
          options: {
            deleteMany: {},
            create: input.options,
          },
        },
        include: { options: true },
      });
    });

    it('does not update a question in a Published Version', async () => {
      prisma.question.findUnique.mockResolvedValue({
        quiz: {
          version: {
            status: CourseVersionStatus.PUBLISHED,
            course: { teacherId: 'teacher-id' },
          },
        },
      });

      await expect(
        service.updateQuestion(
          { id: 'teacher-id', role: UserRole.TEACHER },
          'question-id',
          {
            questionText: 'No',
            points: 1,
            position: 1,
            options: [
              { optionText: 'A', isCorrect: true, position: 1 },
              { optionText: 'B', isCorrect: false, position: 2 },
            ],
          },
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('clearQuestions', () => {
    it('clears every question and stored image from an owned Draft Quiz', async () => {
      prisma.quiz.findUnique.mockResolvedValue({
        version: {
          status: CourseVersionStatus.DRAFT,
          course: { teacherId: 'teacher-id' },
        },
        questions: [
          { imageAsset: { storageKey: 'question-images/one' } },
          { imageAsset: null },
        ],
      });
      prisma.question.deleteMany.mockResolvedValue({ count: 2 });

      await service.clearQuestions(
        { id: 'teacher-id', role: UserRole.TEACHER },
        'quiz-id',
      );

      expect(storage.deleteObject).toHaveBeenCalledWith('question-images/one');
      expect(prisma.question.deleteMany).toHaveBeenCalledWith({ where: { quizId: 'quiz-id' } });
    });
  });

  describe('deleteQuestion', () => {
    it('removes one owned Draft question and its stored image', async () => {
      prisma.question.findUnique.mockResolvedValue({
        quiz: {
          version: {
            status: CourseVersionStatus.DRAFT,
            course: { teacherId: 'teacher-id' },
          },
        },
        imageAsset: { storageKey: 'question-images/one' },
      });
      prisma.question.delete.mockResolvedValue({ id: 'question-id' });

      await service.deleteQuestion(
        { id: 'teacher-id', role: UserRole.TEACHER },
        'question-id',
      );

      expect(storage.deleteObject).toHaveBeenCalledWith('question-images/one');
      expect(prisma.question.delete).toHaveBeenCalledWith({
        where: { id: 'question-id' },
      });
    });

    it('does not remove another Teacher question', async () => {
      prisma.question.findUnique.mockResolvedValue({
        quiz: {
          version: {
            status: CourseVersionStatus.DRAFT,
            course: { teacherId: 'owner-id' },
          },
        },
        imageAsset: null,
      });

      await expect(
        service.deleteQuestion(
          { id: 'other-id', role: UserRole.TEACHER },
          'question-id',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.question.delete).not.toHaveBeenCalled();
    });
  });

  describe('deleteQuiz', () => {
    it('removes an owned Draft Quiz and its stored question images', async () => {
      prisma.quiz.findUnique.mockResolvedValue({
        version: {
          status: CourseVersionStatus.DRAFT,
          course: { teacherId: 'teacher-id' },
        },
        questions: [{ imageAsset: { storageKey: 'question-images/one' } }],
      });
      prisma.quiz.delete.mockResolvedValue({ id: 'quiz-id' });

      await service.deleteQuiz(
        { id: 'teacher-id', role: UserRole.TEACHER },
        'quiz-id',
      );

      expect(storage.deleteObject).toHaveBeenCalledWith('question-images/one');
      expect(prisma.quiz.delete).toHaveBeenCalledWith({ where: { id: 'quiz-id' } });
    });

    it('does not remove a Quiz after the Version leaves Draft', async () => {
      prisma.quiz.findUnique.mockResolvedValue({
        version: {
          status: CourseVersionStatus.SUBMITTED,
          course: { teacherId: 'teacher-id' },
        },
        questions: [],
      });

      await expect(
        service.deleteQuiz(
          { id: 'teacher-id', role: UserRole.TEACHER },
          'quiz-id',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.quiz.delete).not.toHaveBeenCalled();
    });
  });
});
