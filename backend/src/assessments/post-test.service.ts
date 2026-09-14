import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AccountStatus,
  AssetStatus,
  CourseEligibilityMode,
  CourseVersionStatus,
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

interface StartedPostTest {
  attemptId: string;
  expiresAt: Date | null;
  questions: Array<{
    id: string;
    questionText: string;
    imageAssetId: string | null;
    options: Array<{ id: string; optionText: string }>;
  }>;
}

interface PostTestResultRecord {
  id: string;
  score: number | null;
  result: QuizResult | null;
  startedAt: Date;
  submittedAt: Date | null;
}

@Injectable()
export class PostTestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly randomizer: RandomizerService,
  ) {}

  async start(student: StudentActor, quizId: string): Promise<StartedPostTest> {
    this.requireActiveStudent(student);
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        version: {
          include: {
            contentItems: {
              select: {
                completions: { where: { studentId: student.id }, select: { studentId: true } },
              },
            },
            course: {
              select: {
                archivedAt: true,
                eligibilityMode: true,
                allowedMajors: { select: { majorId: true } },
                enrollments: {
                  where: { studentId: student.id },
                  select: { studentId: true },
                },
              },
            },
            quizzes: {
              where: { quizType: QuizType.PRE_TEST },
              select: {
                quizType: true,
                attempts: {
                  where: {
                    studentId: student.id,
                    result: QuizResult.COMPLETED,
                    submittedAt: { not: null },
                  },
                  take: 1,
                  select: { result: true },
                },
              },
            },
          },
        },
        questions: {
          include: { options: true, imageAsset: true },
          orderBy: { position: 'asc' },
        },
      },
    });
    if (!quiz || quiz.quizType !== QuizType.POST_TEST) {
      throw new NotFoundException('Post-Test was not found');
    }
    if (quiz.version.status !== CourseVersionStatus.PUBLISHED) {
      throw new NotFoundException('Published Post-Test was not found');
    }
    if (quiz.version.course.archivedAt) {
      throw new NotFoundException('Published Post-Test was not found');
    }
    if (
      quiz.version.course.eligibilityMode !== CourseEligibilityMode.OPEN &&
      !quiz.version.course.allowedMajors.some((allowed) => allowed.majorId === student.majorId)
    ) {
      throw new ForbiddenException('Student Major is not eligible for this Course');
    }
    if (quiz.version.course.enrollments.length === 0) {
      throw new ForbiddenException('Course enrollment is required');
    }
    const preTest = quiz.version.quizzes[0];
    if (preTest && preTest.attempts.length === 0) {
      throw new ForbiddenException('Pre-Test completion is required');
    }

    if (
      !quiz.version.contentItems.length ||
      quiz.version.contentItems.some((item) => item.completions.length === 0)
    ) {
      throw new ForbiddenException('Complete every lesson before starting the Post-Test');
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
    const attempt = await this.prisma.quizAttempt.create({
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

    return {
      attemptId: attempt.id,
      expiresAt,
      questions: presented.map((question) => ({
        id: question.id,
        questionText: question.questionText,
        imageAssetId:
          question.imageAsset?.status === AssetStatus.READY ? question.imageAsset.id : null,
        options: question.options.map((option) => ({
          id: option.id,
          optionText: option.optionText,
        })),
      })),
    };
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
    if (!attempt || attempt.quiz.quizType !== QuizType.POST_TEST) {
      throw new NotFoundException('Post-Test attempt was not found');
    }
    if (attempt.studentId !== student.id) {
      throw new ForbiddenException('Attempt belongs to another Student');
    }
    if (attempt.submittedAt) {
      throw new ConflictException('Post-Test attempt was already submitted');
    }
    if (attempt.expiresAt && attempt.expiresAt.getTime() < Date.now()) {
      throw new ConflictException('Post-Test time limit has expired');
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
    const result = score >= 80 ? QuizResult.PASS : QuizResult.NOT_PASS;

    await this.prisma.$transaction(async (tx) => {
      await tx.quizAttemptAnswer.createMany({ data: gradedAnswers });
      const updated = await tx.quizAttempt.updateMany({
        where: { id: attemptId, submittedAt: null },
        data: { score, result, submittedAt: new Date() },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Post-Test was submitted concurrently');
      }
    });
    return { score, result };
  }

  async getResults(student: StudentActor, quizId: string): Promise<PostTestResultRecord[]> {
    this.requireActiveStudent(student);
    const attempts = await this.prisma.quizAttempt.findMany({
      where: {
        quizId,
        studentId: student.id,
        submittedAt: { not: null },
        quiz: {
          quizType: QuizType.POST_TEST,
        },
      },
      select: {
        id: true,
        score: true,
        result: true,
        startedAt: true,
        submittedAt: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
    return attempts.map((attempt) => ({
      ...attempt,
      score: attempt.score === null ? null : Number(attempt.score),
    }));
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
