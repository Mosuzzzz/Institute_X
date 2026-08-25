import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, QuizResult, QuizType, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

interface AnalyticsActor {
  id: string;
  role: UserRole;
}

interface AssessmentSummary {
  attempts: number;
  averageScore: number | null;
}

interface TeacherCourseAnalytics {
  enrollments: number;
  accesses: number;
  preTest: AssessmentSummary;
  postTest: AssessmentSummary & {
    pass: number;
    notPass: number;
    passRate: number;
  };
}

interface OwnerDashboard {
  overview: {
    users: number;
    courses: number;
    enrollments: number;
    accesses: number;
    assessmentAttempts: number;
  };
  popularCourses: Array<{
    courseId: string;
    title: string;
    enrollments: number;
  }>;
  postTestResults: { pass: number; notPass: number };
  peakUsage: Array<{ hour: number; accesses: number }>;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTeacherCourseAnalytics(
    actor: AnalyticsActor,
    courseId: string,
  ): Promise<TeacherCourseAnalytics> {
    this.requireRole(actor, UserRole.TEACHER);
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true },
    });
    if (!course) {
      throw new NotFoundException('Course was not found');
    }
    if (course.teacherId !== actor.id) {
      throw new ForbiddenException('Teacher may view only owned Course analytics');
    }

    const [enrollments, accesses, preTest, postTest, postOutcomes] = await Promise.all([
      this.prisma.courseEnrollment.count({ where: { courseId } }),
      this.prisma.courseAccessEvent.count({ where: { courseId } }),
      this.prisma.quizAttempt.aggregate({
        where: {
          submittedAt: { not: null },
          quiz: { quizType: QuizType.PRE_TEST, version: { courseId } },
        },
        _count: { _all: true },
        _avg: { score: true },
      }),
      this.prisma.quizAttempt.aggregate({
        where: {
          submittedAt: { not: null },
          quiz: { quizType: QuizType.POST_TEST, version: { courseId } },
        },
        _count: { _all: true },
        _avg: { score: true },
      }),
      this.prisma.quizAttempt.groupBy({
        by: ['result'],
        where: {
          submittedAt: { not: null },
          quiz: { quizType: QuizType.POST_TEST, version: { courseId } },
          result: { in: [QuizResult.PASS, QuizResult.NOT_PASS] },
        },
        _count: { _all: true },
      }),
    ]);
    const pass = this.outcomeCount(postOutcomes, QuizResult.PASS);
    const notPass = this.outcomeCount(postOutcomes, QuizResult.NOT_PASS);
    const decided = pass + notPass;

    return {
      enrollments,
      accesses,
      preTest: {
        attempts: preTest._count._all,
        averageScore: this.decimalToNumber(preTest._avg.score),
      },
      postTest: {
        attempts: postTest._count._all,
        averageScore: this.decimalToNumber(postTest._avg.score),
        pass,
        notPass,
        passRate: decided === 0 ? 0 : (pass / decided) * 100,
      },
    };
  }

  async getOwnerDashboard(actor: AnalyticsActor): Promise<OwnerDashboard> {
    this.requireRole(actor, UserRole.OWNER);
    const [
      users,
      courses,
      enrollments,
      accesses,
      assessmentAttempts,
      postOutcomes,
      enrollmentGroups,
      peakRows,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.course.count(),
      this.prisma.courseEnrollment.count(),
      this.prisma.courseAccessEvent.count(),
      this.prisma.quizAttempt.count({ where: { submittedAt: { not: null } } }),
      this.prisma.quizAttempt.groupBy({
        by: ['result'],
        where: {
          submittedAt: { not: null },
          quiz: { quizType: QuizType.POST_TEST },
          result: { in: [QuizResult.PASS, QuizResult.NOT_PASS] },
        },
        _count: { _all: true },
      }),
      this.prisma.courseEnrollment.groupBy({
        by: ['courseId'],
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<Array<{ hour: number; accesses: bigint }>>(Prisma.sql`
        SELECT
          EXTRACT(HOUR FROM "accessed_at" AT TIME ZONE 'Asia/Bangkok')::int AS "hour",
          COUNT(*)::bigint AS "accesses"
        FROM "course_access_events"
        GROUP BY 1
        ORDER BY "accesses" DESC, "hour" ASC
      `),
    ]);

    const courseIds = enrollmentGroups.map((group) => group.courseId);
    const popularCourseRecords = await this.prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: {
        id: true,
        versions: {
          where: { status: 'PUBLISHED' },
          take: 1,
          select: { title: true },
        },
      },
    });
    const titles = new Map(
      popularCourseRecords.map((course) => [
        course.id,
        course.versions[0]?.title ?? 'Untitled Course',
      ]),
    );
    const popularCourses = enrollmentGroups
      .map((group) => ({
        courseId: group.courseId,
        title: titles.get(group.courseId) ?? 'Untitled Course',
        enrollments: group._count._all,
      }))
      .sort(
        (left, right) =>
          right.enrollments - left.enrollments ||
          left.title.localeCompare(right.title) ||
          left.courseId.localeCompare(right.courseId),
      );

    return {
      overview: { users, courses, enrollments, accesses, assessmentAttempts },
      popularCourses,
      postTestResults: {
        pass: this.outcomeCount(postOutcomes, QuizResult.PASS),
        notPass: this.outcomeCount(postOutcomes, QuizResult.NOT_PASS),
      },
      peakUsage: peakRows.map((row) => ({
        hour: row.hour,
        accesses: Number(row.accesses),
      })),
    };
  }

  private outcomeCount(
    outcomes: Array<{ result: QuizResult | null; _count: { _all: number } }>,
    result: QuizResult,
  ): number {
    return outcomes.find((outcome) => outcome.result === result)?._count._all ?? 0;
  }

  private decimalToNumber(value: Prisma.Decimal | null): number | null {
    return value === null ? null : Number(value);
  }

  private requireRole(actor: AnalyticsActor, role: UserRole): void {
    if (actor.role !== role) {
      throw new ForbiddenException(`${role} role is required`);
    }
  }
}
