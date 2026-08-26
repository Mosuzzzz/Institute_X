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

type OwnerUser = Prisma.UserGetPayload<{
  select: {
    id: true;
    username: true;
    universityEmail: true;
    fullName: true;
    role: true;
    accountStatus: true;
    createdAt: true;
    updatedAt: true;
    major: { select: { code: true; name: true } };
  };
}>;

interface OwnerActivity {
  id: string;
  type: 'COURSE_ACCESS' | 'TEACHER_PERMISSION' | 'COURSE_VERSION';
  occurredAt: Date;
  actor: string;
  detail: string;
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

  async listOwnerUsers(actor: AnalyticsActor): Promise<OwnerUser[]> {
    this.requireRole(actor, UserRole.OWNER);
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        universityEmail: true,
        fullName: true,
        role: true,
        accountStatus: true,
        createdAt: true,
        updatedAt: true,
        major: { select: { code: true, name: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { fullName: 'asc' }],
    });
  }

  async listOwnerActivity(actor: AnalyticsActor): Promise<OwnerActivity[]> {
    this.requireRole(actor, UserRole.OWNER);
    const [accesses, permissions, versions] = await Promise.all([
      this.prisma.courseAccessEvent.findMany({
        take: 20,
        orderBy: { accessedAt: 'desc' },
        include: { student: { select: { fullName: true } }, course: { select: { id: true } } },
      }),
      this.prisma.teacherPermissionRequest.findMany({
        take: 20,
        orderBy: { requestedAt: 'desc' },
        include: { teacher: { select: { fullName: true } } },
      }),
      this.prisma.courseVersion.findMany({
        take: 20,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, status: true, updatedAt: true },
      }),
    ]);
    return [
      ...accesses.map((event) => ({ id: event.id, type: 'COURSE_ACCESS' as const, occurredAt: event.accessedAt, actor: event.student.fullName, detail: `Accessed course ${event.course.id}` })),
      ...permissions.map((request) => ({ id: request.id, type: 'TEACHER_PERMISSION' as const, occurredAt: request.requestedAt, actor: request.teacher.fullName, detail: `Permission ${request.status.toLowerCase()}` })),
      ...versions.map((version) => ({ id: version.id, type: 'COURSE_VERSION' as const, occurredAt: version.updatedAt, actor: 'Course authoring', detail: `${version.title} · ${version.status}` })),
    ].sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime()).slice(0, 30);
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
