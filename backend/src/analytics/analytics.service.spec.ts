import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { QuizResult, QuizType, UserRole } from '@prisma/client';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  const prisma = {
    course: { findUnique: jest.fn(), count: jest.fn(), findMany: jest.fn() },
    user: { count: jest.fn() },
    courseEnrollment: { count: jest.fn(), groupBy: jest.fn() },
    courseAccessEvent: { count: jest.fn() },
    quizAttempt: { aggregate: jest.fn(), groupBy: jest.fn(), count: jest.fn() },
    $queryRaw: jest.fn(),
  };
  let service: AnalyticsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new AnalyticsService(prisma as never);
  });

  describe('getTeacherCourseAnalytics', () => {
    it('returns enrollment, traffic, and assessment statistics for an owned Course', async () => {
      prisma.course.findUnique.mockResolvedValue({ teacherId: 'teacher-id' });
      prisma.courseEnrollment.count.mockResolvedValue(25);
      prisma.courseAccessEvent.count.mockResolvedValue(100);
      prisma.quizAttempt.aggregate
        .mockResolvedValueOnce({ _count: { _all: 25 }, _avg: { score: 65 } })
        .mockResolvedValueOnce({ _count: { _all: 40 }, _avg: { score: 78 } });
      prisma.quizAttempt.groupBy.mockResolvedValue([
        { result: QuizResult.PASS, _count: { _all: 30 } },
        { result: QuizResult.NOT_PASS, _count: { _all: 10 } },
      ]);

      await expect(
        service.getTeacherCourseAnalytics(
          { id: 'teacher-id', role: UserRole.TEACHER },
          'course-id',
        ),
      ).resolves.toEqual({
        enrollments: 25,
        accesses: 100,
        preTest: { attempts: 25, averageScore: 65 },
        postTest: {
          attempts: 40,
          averageScore: 78,
          pass: 30,
          notPass: 10,
          passRate: 75,
        },
      });
    });

    it('denies analytics for another Teacher Course', async () => {
      prisma.course.findUnique.mockResolvedValue({ teacherId: 'owner-id' });

      await expect(
        service.getTeacherCourseAnalytics({ id: 'other-id', role: UserRole.TEACHER }, 'course-id'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns not found for an unknown Course', async () => {
      prisma.course.findUnique.mockResolvedValue(null);

      await expect(
        service.getTeacherCourseAnalytics({ id: 'teacher-id', role: UserRole.TEACHER }, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getOwnerDashboard', () => {
    it('returns system overview and popularity ranked by enrollments', async () => {
      prisma.user.count.mockResolvedValue(100);
      prisma.course.count.mockResolvedValue(10);
      prisma.courseEnrollment.count.mockResolvedValue(60);
      prisma.courseAccessEvent.count.mockResolvedValue(500);
      prisma.quizAttempt.count.mockResolvedValue(80);
      prisma.quizAttempt.groupBy.mockResolvedValue([
        { result: QuizResult.PASS, _count: { _all: 50 } },
        { result: QuizResult.NOT_PASS, _count: { _all: 30 } },
      ]);
      prisma.courseEnrollment.groupBy.mockResolvedValue([
        { courseId: 'course-b', _count: { _all: 30 } },
        { courseId: 'course-a', _count: { _all: 30 } },
      ]);
      prisma.course.findMany.mockResolvedValue([
        { id: 'course-a', versions: [{ title: 'Course A' }] },
        { id: 'course-b', versions: [{ title: 'Course B' }] },
      ]);
      prisma.$queryRaw.mockResolvedValue([{ hour: 14, accesses: 75n }]);

      const result = await service.getOwnerDashboard({
        id: 'owner-id',
        role: UserRole.OWNER,
      });

      expect(result.overview).toEqual({
        users: 100,
        courses: 10,
        enrollments: 60,
        accesses: 500,
        assessmentAttempts: 80,
      });
      expect(result.popularCourses).toEqual([
        { courseId: 'course-a', title: 'Course A', enrollments: 30 },
        { courseId: 'course-b', title: 'Course B', enrollments: 30 },
      ]);
      expect(result.postTestResults).toEqual({ pass: 50, notPass: 30 });
      expect(result.peakUsage).toEqual([{ hour: 14, accesses: 75 }]);
    });

    it('denies system analytics to non-Owners', async () => {
      await expect(
        service.getOwnerDashboard({
          id: 'teacher-id',
          role: UserRole.TEACHER,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.count).not.toHaveBeenCalled();
    });

    it('counts only Post-Test PASS and NOT_PASS outcomes', async () => {
      prisma.user.count.mockResolvedValue(0);
      prisma.course.count.mockResolvedValue(0);
      prisma.courseEnrollment.count.mockResolvedValue(0);
      prisma.courseAccessEvent.count.mockResolvedValue(0);
      prisma.quizAttempt.count.mockResolvedValue(0);
      prisma.quizAttempt.groupBy.mockResolvedValue([]);
      prisma.courseEnrollment.groupBy.mockResolvedValue([]);
      prisma.course.findMany.mockResolvedValue([]);
      prisma.$queryRaw.mockResolvedValue([]);

      await service.getOwnerDashboard({ id: 'owner-id', role: UserRole.OWNER });

      expect(prisma.quizAttempt.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            submittedAt: { not: null },
            quiz: { quizType: QuizType.POST_TEST },
            result: { in: [QuizResult.PASS, QuizResult.NOT_PASS] },
          },
        }),
      );
    });
  });
});
