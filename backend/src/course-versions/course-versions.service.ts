import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CourseVersionStatus, QuizType, ReviewDecision, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

interface VersionActor {
  id: string;
  role: UserRole;
}

@Injectable()
export class CourseVersionsService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(actor: VersionActor, versionId: string): Promise<void> {
    this.requireRole(actor, UserRole.TEACHER);
    const version = await this.prisma.courseVersion.findUnique({
      where: { id: versionId },
      include: {
        course: { include: { allowedMajors: true } },
        contentItems: { select: { id: true } },
        quizzes: {
          include: { questions: { include: { options: true } } },
        },
      },
    });
    if (!version) {
      throw new NotFoundException('Course Version was not found');
    }
    if (version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may submit this Version');
    }
    if (version.status !== CourseVersionStatus.DRAFT) {
      throw new ConflictException('Only a Draft Version may be submitted');
    }
    this.validateSubmission(version);

    await this.prisma.$transaction(async (tx) => {
      const submission = await tx.courseVersionReview.aggregate({
        where: { versionId },
        _max: { submissionNumber: true },
      });
      const submittedAt = new Date();
      const updated = await tx.courseVersion.updateMany({
        where: { id: versionId, status: CourseVersionStatus.DRAFT },
        data: { status: CourseVersionStatus.SUBMITTED, submittedAt },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Version state changed concurrently');
      }
      await tx.courseVersionReview.create({
        data: {
          versionId,
          submissionNumber: (submission._max.submissionNumber ?? 0) + 1,
          submittedAt,
        },
      });
    });
  }

  async review(
    actor: VersionActor,
    versionId: string,
    decision: ReviewDecision,
    comment?: string,
  ): Promise<void> {
    this.requireRole(actor, UserRole.APPROVER);
    const normalizedComment = comment?.trim() || null;
    if (decision === ReviewDecision.REJECTED && normalizedComment === null) {
      throw new UnprocessableEntityException('A rejection comment is required');
    }

    const version = await this.prisma.courseVersion.findUnique({
      where: { id: versionId },
      select: { id: true, courseId: true, status: true },
    });
    if (!version) {
      throw new NotFoundException('Course Version was not found');
    }
    if (version.status !== CourseVersionStatus.SUBMITTED) {
      throw new ConflictException('Only a submitted Version may be reviewed');
    }

    await this.prisma.$transaction(async (tx) => {
      const reviewedAt = new Date();
      if (decision === ReviewDecision.APPROVED) {
        await tx.courseVersion.updateMany({
          where: {
            courseId: version.courseId,
            status: CourseVersionStatus.PUBLISHED,
          },
          data: { status: CourseVersionStatus.SUPERSEDED },
        });
      }

      const updated = await tx.courseVersion.updateMany({
        where: { id: versionId, status: CourseVersionStatus.SUBMITTED },
        data:
          decision === ReviewDecision.APPROVED
            ? {
                status: CourseVersionStatus.PUBLISHED,
                publishedAt: reviewedAt,
              }
            : { status: CourseVersionStatus.REJECTED },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Version was reviewed concurrently');
      }

      const review = await tx.courseVersionReview.updateMany({
        where: { versionId, decision: null },
        data: {
          decision,
          reviewComment: normalizedComment,
          reviewedById: actor.id,
          reviewedAt,
        },
      });
      if (review.count !== 1) {
        throw new ConflictException('Pending review record was not found');
      }
    });
  }

  async reopenRejected(actor: VersionActor, versionId: string): Promise<void> {
    this.requireRole(actor, UserRole.TEACHER);
    const version = await this.prisma.courseVersion.findUnique({
      where: { id: versionId },
      select: {
        status: true,
        course: { select: { teacherId: true } },
      },
    });
    if (!version) {
      throw new NotFoundException('Course Version was not found');
    }
    if (version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may reopen this Version');
    }
    if (version.status !== CourseVersionStatus.REJECTED) {
      throw new ConflictException('Only a rejected Version may be reopened');
    }

    const updated = await this.prisma.courseVersion.updateMany({
      where: { id: versionId, status: CourseVersionStatus.REJECTED },
      data: { status: CourseVersionStatus.DRAFT, submittedAt: null },
    });
    if (updated.count !== 1) {
      throw new ConflictException('Version state changed concurrently');
    }
  }

  private validateSubmission(version: {
    course: { allowedMajors: unknown[] };
    contentItems: unknown[];
    quizzes: Array<{
      quizType: QuizType;
      questions: Array<{ options: Array<{ isCorrect: boolean }> }>;
    }>;
  }): void {
    if (version.course.allowedMajors.length === 0) {
      throw new UnprocessableEntityException('At least one eligible Major is required');
    }
    if (version.contentItems.length === 0) {
      throw new UnprocessableEntityException('Learning content is required');
    }
    const preTest = version.quizzes.find((quiz) => quiz.quizType === QuizType.PRE_TEST);
    if (!preTest || preTest.questions.length === 0) {
      throw new UnprocessableEntityException('A Pre-Test with questions is required');
    }
    for (const question of preTest.questions) {
      if (
        question.options.length < 2 ||
        question.options.filter((option) => option.isCorrect).length !== 1
      ) {
        throw new UnprocessableEntityException(
          'Every question requires at least two options and exactly one correct option',
        );
      }
    }
  }

  private requireRole(actor: VersionActor, role: UserRole): void {
    if (actor.role !== role) {
      throw new ForbiddenException(`${role} role is required`);
    }
  }
}
