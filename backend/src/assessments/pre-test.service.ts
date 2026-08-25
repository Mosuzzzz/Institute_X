import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AccountStatus,
  CourseVersionStatus,
  Prisma,
  QuizResult,
  QuizType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RandomizerService } from './randomizer.service';

interface StudentActor {
  id: string;
  role: UserRole;
  accountStatus: AccountStatus;
  majorId?: string | null;
}

interface SubmittedAnswer {
  questionId: string;
  optionId: string;
}

interface PresentedQuestion {
  id: string;
  questionText: string;
  options: Array<{ id: string; optionText: string }>;
}

interface StartedPreTest {
  attemptId: string;
  expiresAt: Date | null;
  questions: PresentedQuestion[];
}

@Injectable()
export class PreTestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly randomizer: RandomizerService,
  ) {}

  async start(student: StudentActor, quizId: string): Promise<StartedPreTest> {
    this.requireActiveStudent(student);
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        version: {
          include: {
            course: {
              select: {
                allowedMajors: { select: { majorId: true } },
                enrollments: {
                  where: { studentId: student.id },
                  select: { studentId: true },
                },
              },
            },
          },
        },
        questions: { include: { options: true }, orderBy: { position: 'asc' } },
      },
    });
    if (!quiz || quiz.quizType !== QuizType.PRE_TEST) {
      throw new NotFoundException('Pre-Test was not found');
    }
    if (quiz.version.status !== CourseVersionStatus.PUBLISHED) {
      throw new NotFoundException('Published Pre-Test was not found');
    }
    if (
      !quiz.version.course.allowedMajors.some(
        (allowed) => allowed.majorId === student.majorId,
      )
    ) {
      throw new ForbiddenException('Student Major is not eligible for this Course');
    }
    if (quiz.version.course.enrollments.length === 0) {
      throw new ForbiddenException('Course enrollment is required');
    }

    const questions = quiz.randomizeQuestions
      ? this.randomizer.shuffle(quiz.questions)
      : quiz.questions;
    const presented = questions.map((question) => ({
      ...question,
      options: quiz.randomizeOptions ? this.randomizer.shuffle(question.options) : question.options,
    }));
    const expiresAt = quiz.durationSeconds
      ? new Date(Date.now() + quiz.durationSeconds * 1000)
      : null;

    try {
      const attempt = await this.prisma.$transaction(
        async (tx) => {
          const completed = await tx.quizAttempt.findFirst({
            where: { quizId, studentId: student.id, submittedAt: { not: null } },
            select: { id: true },
          });
          if (completed) {
            throw new ConflictException('Pre-Test may be completed only once');
          }
          return tx.quizAttempt.create({
            data: {
              quizId,
              studentId: student.id,
              expiresAt,
              presentedQuestions: {
                create: presented.map((question, index) => ({
                  questionId: question.id,
                  displayPosition: index + 1,
                })),
              },
              presentedOptions: {
                create: presented.flatMap((question) =>
                  question.options.map((option, index) => ({
                    questionId: question.id,
                    optionId: option.id,
                    displayPosition: index + 1,
                  })),
                ),
              },
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return {
        attemptId: attempt.id,
        expiresAt,
        questions: presented.map((question) => ({
          id: question.id,
          questionText: question.questionText,
          options: question.options.map((option) => ({
            id: option.id,
            optionText: option.optionText,
          })),
        })),
      };
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Pre-Test attempt started concurrently');
      }
      throw error;
    }
  }

  async submit(
    student: StudentActor,
    attemptId: string,
    answers: SubmittedAnswer[],
  ): Promise<{ score: number; result: QuizResult }> {
    this.requireActiveStudent(student);
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: true,
        presentedQuestions: {
          include: { question: { include: { options: true } } },
        },
      },
    });
    if (!attempt || attempt.quiz.quizType !== QuizType.PRE_TEST) {
      throw new NotFoundException('Pre-Test attempt was not found');
    }
    if (attempt.studentId !== student.id) {
      throw new ForbiddenException('Attempt belongs to another Student');
    }
    if (attempt.submittedAt) {
      throw new ConflictException('Pre-Test attempt was already submitted');
    }
    if (attempt.expiresAt && attempt.expiresAt.getTime() < Date.now()) {
      throw new ConflictException('Pre-Test time limit has expired');
    }

    const questions = attempt.presentedQuestions.map((item) => item.question);
    const answerMap = new Map(answers.map((answer) => [answer.questionId, answer]));
    if (answerMap.size !== answers.length || answerMap.size !== questions.length) {
      throw new UnprocessableEntityException(
        'Every presented question must be answered exactly once',
      );
    }

    let earnedPoints = 0;
    let totalPoints = 0;
    const gradedAnswers = questions.map((question) => {
      const answer = answerMap.get(question.id);
      const selectedOption = question.options.find((option) => option.id === answer?.optionId);
      if (!answer || !selectedOption) {
        throw new UnprocessableEntityException('An answer option does not belong to its question');
      }
      const points = Number(question.points);
      const pointsAwarded = selectedOption.isCorrect ? points : 0;
      totalPoints += points;
      earnedPoints += pointsAwarded;
      return {
        attemptId,
        questionId: question.id,
        selectedOptionId: selectedOption.id,
        isCorrect: selectedOption.isCorrect,
        pointsAwarded,
      };
    });
    const score = totalPoints === 0 ? 0 : (earnedPoints / totalPoints) * 100;
    const result = QuizResult.COMPLETED;

    await this.prisma.$transaction(async (tx) => {
      await tx.quizAttemptAnswer.createMany({ data: gradedAnswers });
      const updated = await tx.quizAttempt.updateMany({
        where: { id: attemptId, submittedAt: null },
        data: { score, result, submittedAt: new Date() },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Pre-Test was submitted concurrently');
      }
    });
    return { score, result };
  }

  private requireActiveStudent(student: StudentActor): void {
    if (student.role !== UserRole.STUDENT) {
      throw new ForbiddenException('STUDENT role is required');
    }
    if (student.accountStatus !== AccountStatus.ACTIVE) {
      throw new ForbiddenException('Institutional account is inactive');
    }
    if (!student.majorId) {
      throw new UnprocessableEntityException('Student Major is required');
    }
  }
}
