import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  CourseVersionStatus,
  Prisma,
  QuestionType,
  Quiz,
  QuizType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ObjectStorage } from '../media/object-storage';

interface QuizActor {
  id: string;
  role: UserRole;
}

interface CreateQuizInput {
  quizType: QuizType;
  title: string;
  durationSeconds?: number | null;
}

interface UpdateQuizInput {
  title?: string;
  durationSeconds?: number | null;
}

interface QuestionOptionInput {
  optionText: string;
  isCorrect: boolean;
  position: number;
}

interface AddQuestionInput {
  questionText: string;
  points: number;
  position: number;
  options: QuestionOptionInput[];
}

type QuestionWithOptions = Prisma.QuestionGetPayload<{
  include: { options: true };
}>;

type OwnedDraftQuiz = Prisma.QuizGetPayload<{
  include: {
    version: { include: { course: { select: { teacherId: true } } } };
    questions: { select: { imageAsset: { select: { storageKey: true } } } };
  };
}>;

@Injectable()
export class QuizAuthoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorage,
  ) {}

  async createQuiz(actor: QuizActor, versionId: string, input: CreateQuizInput): Promise<Quiz> {
    this.requireTeacher(actor);
    const title = input.title.trim();
    if (!title) {
      throw new UnprocessableEntityException('Quiz title is required');
    }
    if (
      input.durationSeconds !== undefined &&
      input.durationSeconds !== null &&
      (!Number.isInteger(input.durationSeconds) || input.durationSeconds < 1)
    ) {
      throw new UnprocessableEntityException('Quiz duration must be a positive number of seconds');
    }
    await this.requireOwnedDraft(actor.id, versionId);

    try {
      return await this.prisma.quiz.create({
        data: {
          versionId,
          quizType: input.quizType,
          title,
          durationSeconds: input.durationSeconds ?? null,
          randomizeQuestions: true,
          randomizeOptions: true,
        },
      });
    } catch (error: unknown) {
      if (this.isUniqueConflict(error)) {
        throw new ConflictException('This Version already has a Quiz of the requested type');
      }
      throw error;
    }
  }

  async addQuestion(
    actor: QuizActor,
    quizId: string,
    input: AddQuestionInput,
  ): Promise<QuestionWithOptions> {
    this.requireTeacher(actor);
    this.validateQuestion(input);
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        version: { include: { course: { select: { teacherId: true } } } },
      },
    });
    if (!quiz) {
      throw new NotFoundException('Quiz was not found');
    }
    if (quiz.version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may edit this Quiz');
    }
    if (quiz.version.status !== CourseVersionStatus.DRAFT) {
      throw new ConflictException('Only a Draft Version may be changed');
    }

    try {
      return await this.prisma.question.create({
        data: {
          quizId,
          questionText: input.questionText.trim(),
          questionType: QuestionType.MULTIPLE_CHOICE,
          points: input.points,
          position: input.position,
          options: {
            create: input.options.map((option) => ({
              optionText: option.optionText.trim(),
              isCorrect: option.isCorrect,
              position: option.position,
            })),
          },
        },
        include: { options: true },
      });
    } catch (error: unknown) {
      if (this.isUniqueConflict(error)) {
        throw new ConflictException('Question or option position is already in use');
      }
      throw error;
    }
  }

  async updateQuiz(actor: QuizActor, quizId: string, input: UpdateQuizInput): Promise<Quiz> {
    this.requireTeacher(actor);
    if (input.title === undefined && input.durationSeconds === undefined) {
      throw new UnprocessableEntityException('At least one Quiz field is required');
    }
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        version: { include: { course: { select: { teacherId: true } } } },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz was not found');
    if (quiz.version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may edit this Quiz');
    }
    if (quiz.version.status !== CourseVersionStatus.DRAFT) {
      throw new ConflictException('Only a Draft Version may be changed');
    }

    const data: UpdateQuizInput = {};
    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) throw new UnprocessableEntityException('Quiz title is required');
      data.title = title;
    }
    if (input.durationSeconds !== undefined) {
      if (
        input.durationSeconds !== null &&
        (!Number.isInteger(input.durationSeconds) || input.durationSeconds < 1)
      ) {
        throw new UnprocessableEntityException(
          'Quiz duration must be a positive number of seconds',
        );
      }
      data.durationSeconds = input.durationSeconds;
    }
    return this.prisma.quiz.update({ where: { id: quizId }, data });
  }

  async updateQuestion(
    actor: QuizActor,
    questionId: string,
    input: AddQuestionInput,
  ): Promise<QuestionWithOptions> {
    this.requireTeacher(actor);
    this.validateQuestion(input);
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        quiz: {
          include: {
            version: { include: { course: { select: { teacherId: true } } } },
          },
        },
      },
    });
    if (!question) throw new NotFoundException('Question was not found');
    if (question.quiz.version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may edit this Question');
    }
    if (question.quiz.version.status !== CourseVersionStatus.DRAFT) {
      throw new ConflictException('Only a Draft Version may be changed');
    }

    try {
      return await this.prisma.question.update({
        where: { id: questionId },
        data: {
          questionText: input.questionText.trim(),
          questionType: QuestionType.MULTIPLE_CHOICE,
          points: input.points,
          position: input.position,
          options: {
            deleteMany: {},
            create: input.options.map((option) => ({
              optionText: option.optionText.trim(),
              isCorrect: option.isCorrect,
              position: option.position,
            })),
          },
        },
        include: { options: true },
      });
    } catch (error: unknown) {
      if (this.isUniqueConflict(error)) {
        throw new ConflictException('Question or option position is already in use');
      }
      throw error;
    }
  }

  async clearQuestions(actor: QuizActor, quizId: string): Promise<void> {
    const quiz = await this.requireOwnedDraftQuiz(actor, quizId);
    await Promise.all(
      quiz.questions.flatMap((question) =>
        question.imageAsset ? [this.storage.deleteObject(question.imageAsset.storageKey)] : [],
      ),
    );
    await this.prisma.question.deleteMany({ where: { quizId } });
  }

  async deleteQuestion(actor: QuizActor, questionId: string): Promise<void> {
    this.requireTeacher(actor);
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        quiz: {
          include: {
            version: { include: { course: { select: { teacherId: true } } } },
          },
        },
        imageAsset: { select: { storageKey: true } },
      },
    });
    if (!question) throw new NotFoundException('Question was not found');
    if (question.quiz.version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may delete this Question');
    }
    if (question.quiz.version.status !== CourseVersionStatus.DRAFT) {
      throw new ConflictException('Only a Draft Version may be changed');
    }
    if (question.imageAsset) {
      await this.storage.deleteObject(question.imageAsset.storageKey);
    }
    await this.prisma.question.delete({ where: { id: questionId } });
  }

  async deleteQuiz(actor: QuizActor, quizId: string): Promise<void> {
    const quiz = await this.requireOwnedDraftQuiz(actor, quizId);
    await Promise.all(
      quiz.questions.flatMap((question) =>
        question.imageAsset ? [this.storage.deleteObject(question.imageAsset.storageKey)] : [],
      ),
    );
    await this.prisma.quiz.delete({ where: { id: quizId } });
  }

  private async requireOwnedDraftQuiz(
    actor: QuizActor,
    quizId: string,
  ): Promise<OwnedDraftQuiz> {
    this.requireTeacher(actor);
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        version: { include: { course: { select: { teacherId: true } } } },
        questions: {
          select: { imageAsset: { select: { storageKey: true } } },
        },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz was not found');
    if (quiz.version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may edit this Quiz');
    }
    if (quiz.version.status !== CourseVersionStatus.DRAFT) {
      throw new ConflictException('Only a Draft Version may be changed');
    }
    return quiz;
  }

  private async requireOwnedDraft(teacherId: string, versionId: string): Promise<void> {
    const version = await this.prisma.courseVersion.findUnique({
      where: { id: versionId },
      include: { course: { select: { teacherId: true } } },
    });
    if (!version) {
      throw new NotFoundException('Course Version was not found');
    }
    if (version.course.teacherId !== teacherId) {
      throw new ForbiddenException('Only the owning Teacher may edit this Course');
    }
    if (version.status !== CourseVersionStatus.DRAFT) {
      throw new ConflictException('Only a Draft Version may be changed');
    }
  }

  private validateQuestion(input: AddQuestionInput): void {
    if (!input.questionText.trim()) {
      throw new UnprocessableEntityException('Question text is required');
    }
    if (input.points <= 0 || !Number.isFinite(input.points)) {
      throw new UnprocessableEntityException('Question points must be positive');
    }
    if (!Number.isInteger(input.position) || input.position < 1) {
      throw new UnprocessableEntityException('Question position must be positive');
    }
    if (input.options.length < 2) {
      throw new UnprocessableEntityException('At least two answer options are required');
    }
    if (input.options.filter((option) => option.isCorrect).length !== 1) {
      throw new UnprocessableEntityException('Exactly one correct option is required');
    }
    const positions = input.options.map((option) => option.position);
    if (
      input.options.some(
        (option) =>
          !option.optionText.trim() || !Number.isInteger(option.position) || option.position < 1,
      ) ||
      new Set(positions).size !== positions.length
    ) {
      throw new UnprocessableEntityException('Options require text and unique positive positions');
    }
  }

  private requireTeacher(actor: QuizActor): void {
    if (actor.role !== UserRole.TEACHER) {
      throw new ForbiddenException('TEACHER role is required');
    }
  }

  private isUniqueConflict(error: unknown): boolean {
    return (
      (error instanceof Prisma.PrismaClientKnownRequestError ||
        (typeof error === 'object' && error !== null && 'code' in error)) &&
      (error as { code?: unknown }).code === 'P2002'
    );
  }
}
