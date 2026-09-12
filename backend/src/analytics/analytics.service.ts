import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AccountStatus,
  CourseVersionStatus,
  Prisma,
  QuizResult,
  QuizType,
  TeacherPermissionStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

interface AnalyticsActor {
  id: string;
  role: UserRole;
}

interface AssessmentSummary {
  attempts: number;
  averageScore: number | null;
}

interface ExecutiveLearningAnalytics {
  summary: {
    enrollments: number;
    completedEnrollments: number;
    completionRate: number;
    preTestAverage: number | null;
    postTestAverage: number | null;
  };
  courses: Array<{
    courseId: string;
    title: string;
    enrollments: number;
    completed: number;
    accesses: number;
    preTestAttempts: number;
    postTestAttempts: number;
    preTestAverage: number | null;
    postTestAverage: number | null;
    completionRate: number;
  }>;
  byMajor: Array<{
    majorCode: string | null;
    majorName: string | null;
    enrollments: number;
    completed: number;
    preTestAverage: number | null;
    postTestAverage: number | null;
    completionRate: number;
  }>;
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
    activeUsers: number;
    courses: number;
    enrollments: number;
    accesses: number;
    assessmentAttempts: number;
    pendingTeacherPermissions: number;
  };
  usersByRole: Array<{ role: UserRole; users: number }>;
  courseVersionsByStatus: Array<{
    status: CourseVersionStatus;
    versions: number;
  }>;
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
    universityEmail: true;
    fullName: true;
    roles: { select: { role: true } };
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

  async getExecutiveLearningAnalytics(actor: AnalyticsActor): Promise<ExecutiveLearningAnalytics> {
    this.requireRole(actor, UserRole.EXECUTIVE);
    type CourseRow = {
      courseId: string;
      title: string;
      enrollments: bigint;
      completed: bigint;
      accesses: bigint;
      preTestAttempts: bigint;
      postTestAttempts: bigint;
      preTestAverage: number | null;
      postTestAverage: number | null;
    };
    type MajorRow = {
      majorCode: string | null;
      majorName: string | null;
      enrollments: bigint;
      completed: bigint;
      preTestAverage: number | null;
      postTestAverage: number | null;
    };
    const [courseRows, majorRows] = await Promise.all([
      this.prisma.$queryRaw<CourseRow[]>(Prisma.sql`
        SELECT c.course_id AS "courseId",
          COALESCE((SELECT title FROM course_versions WHERE course_id = c.course_id ORDER BY version_number DESC LIMIT 1), 'Untitled Course') AS title,
          (SELECT COUNT(*) FROM course_enrollments WHERE course_id = c.course_id) AS enrollments,
          (SELECT COUNT(*) FROM course_enrollments e WHERE e.course_id = c.course_id AND EXISTS (
            SELECT 1 FROM quiz_attempts a JOIN quizzes q ON q.quiz_id = a.quiz_id JOIN course_versions v ON v.version_id = q.version_id
            WHERE v.course_id = c.course_id AND a.student_id = e.student_id AND q.quiz_type = 'POST_TEST' AND a.result = 'PASS' AND a.submitted_at IS NOT NULL
          )) AS completed,
          (SELECT COUNT(*) FROM course_access_events WHERE course_id = c.course_id) AS accesses,
          s."preTestAttempts", s."postTestAttempts", s."preTestAverage", s."postTestAverage"
        FROM courses c
        CROSS JOIN LATERAL (
          SELECT COUNT(*) FILTER (WHERE q.quiz_type = 'PRE_TEST') AS "preTestAttempts",
            COUNT(*) FILTER (WHERE q.quiz_type = 'POST_TEST') AS "postTestAttempts",
            AVG(a.score) FILTER (WHERE q.quiz_type = 'PRE_TEST')::float8 AS "preTestAverage",
            AVG(a.score) FILTER (WHERE q.quiz_type = 'POST_TEST')::float8 AS "postTestAverage"
          FROM quiz_attempts a JOIN quizzes q ON q.quiz_id = a.quiz_id JOIN course_versions v ON v.version_id = q.version_id
          WHERE v.course_id = c.course_id AND a.submitted_at IS NOT NULL
        ) s
        ORDER BY enrollments DESC, title ASC
      `),
      this.prisma.$queryRaw<MajorRow[]>(Prisma.sql`
        SELECT m.major_code AS "majorCode", m.major_name AS "majorName", COUNT(*) AS enrollments,
          COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM quiz_attempts a JOIN quizzes q ON q.quiz_id = a.quiz_id JOIN course_versions v ON v.version_id = q.version_id
            WHERE v.course_id = e.course_id AND a.student_id = e.student_id AND q.quiz_type = 'POST_TEST' AND a.result = 'PASS' AND a.submitted_at IS NOT NULL
          )) AS completed,
          AVG((SELECT AVG(a.score) FROM quiz_attempts a JOIN quizzes q ON q.quiz_id = a.quiz_id JOIN course_versions v ON v.version_id = q.version_id
            WHERE v.course_id = e.course_id AND a.student_id = e.student_id AND q.quiz_type = 'PRE_TEST' AND a.submitted_at IS NOT NULL))::float8 AS "preTestAverage",
          AVG((SELECT AVG(a.score) FROM quiz_attempts a JOIN quizzes q ON q.quiz_id = a.quiz_id JOIN course_versions v ON v.version_id = q.version_id
            WHERE v.course_id = e.course_id AND a.student_id = e.student_id AND q.quiz_type = 'POST_TEST' AND a.submitted_at IS NOT NULL))::float8 AS "postTestAverage"
        FROM course_enrollments e JOIN users u ON u.user_id = e.student_id LEFT JOIN majors m ON m.major_id = u.major_id
        GROUP BY m.major_code, m.major_name ORDER BY enrollments DESC
      `),
    ]);
    const completionRate = (completed: number, total: number): number =>
      total ? (completed / total) * 100 : 0;
    const courses = courseRows.map((row) => ({
      ...row,
      enrollments: Number(row.enrollments),
      completed: Number(row.completed),
      accesses: Number(row.accesses),
      preTestAttempts: Number(row.preTestAttempts),
      postTestAttempts: Number(row.postTestAttempts),
      completionRate: completionRate(Number(row.completed), Number(row.enrollments)),
    }));
    const byMajor = majorRows.map((row) => ({
      ...row,
      enrollments: Number(row.enrollments),
      completed: Number(row.completed),
      completionRate: completionRate(Number(row.completed), Number(row.enrollments)),
    }));
    const enrollments = courses.reduce((sum, row) => sum + row.enrollments, 0);
    const completedEnrollments = courses.reduce((sum, row) => sum + row.completed, 0);
    const average = (type: 'preTest' | 'postTest'): number | null => {
      const count = courses.reduce((sum, row) => sum + row[`${type}Attempts`], 0);
      return count
        ? courses.reduce(
            (sum, row) => sum + (row[`${type}Average`] ?? 0) * row[`${type}Attempts`],
            0,
          ) / count
        : null;
    };
    return {
      summary: {
        enrollments,
        completedEnrollments,
        completionRate: completionRate(completedEnrollments, enrollments),
        preTestAverage: average('preTest'),
        postTestAverage: average('postTest'),
      },
      courses,
      byMajor,
    };
  }

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
    this.requireRole(actor, UserRole.EXECUTIVE);
    const [
      users,
      activeUsers,
      usersByRole,
      courses,
      courseVersionsByStatus,
      pendingTeacherPermissions,
      enrollments,
      accesses,
      assessmentAttempts,
      postOutcomes,
      enrollmentGroups,
      peakRows,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { accountStatus: AccountStatus.ACTIVE } }),
      this.prisma.userRoleAssignment.groupBy({
        by: ['role'],
        _count: { _all: true },
      }),
      this.prisma.course.count(),
      this.prisma.courseVersion.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.teacherPermissionRequest.count({
        where: { status: TeacherPermissionStatus.PENDING },
      }),
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
      overview: {
        users,
        activeUsers,
        courses,
        enrollments,
        accesses,
        assessmentAttempts,
        pendingTeacherPermissions,
      },
      usersByRole: usersByRole.map((group) => ({
        role: group.role,
        users: group._count._all,
      })),
      courseVersionsByStatus: courseVersionsByStatus.map((group) => ({
        status: group.status,
        versions: group._count._all,
      })),
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
    this.requireRole(actor, UserRole.EXECUTIVE);
    return this.prisma.user.findMany({
      select: {
        id: true,
        universityEmail: true,
        fullName: true,
        roles: { select: { role: true }, orderBy: { assignedAt: 'asc' } },
        accountStatus: true,
        createdAt: true,
        updatedAt: true,
        major: { select: { code: true, name: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { fullName: 'asc' }],
    });
  }

  async listOwnerActivity(actor: AnalyticsActor): Promise<OwnerActivity[]> {
    this.requireRole(actor, UserRole.EXECUTIVE);
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
      ...accesses.map((event) => ({
        id: event.id,
        type: 'COURSE_ACCESS' as const,
        occurredAt: event.accessedAt,
        actor: event.student.fullName,
        detail: `Accessed course ${event.course.id}`,
      })),
      ...permissions.map((request) => ({
        id: request.id,
        type: 'TEACHER_PERMISSION' as const,
        occurredAt: request.requestedAt,
        actor: request.teacher.fullName,
        detail: `Permission ${request.status.toLowerCase()}`,
      })),
      ...versions.map((version) => ({
        id: version.id,
        type: 'COURSE_VERSION' as const,
        occurredAt: version.updatedAt,
        actor: 'Course authoring',
        detail: `${version.title} · ${version.status}`,
      })),
    ]
      .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
      .slice(0, 30);
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
