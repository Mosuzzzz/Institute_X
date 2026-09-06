'use client';

import Link from 'next/link';
import type { TeacherCourseDto, TeacherPermissionDto } from '../../lib/backend-api';
import { useBackendQuery } from '../../lib/use-backend-query';
import { useAppLanguage } from '../../lib/language';
import ApiState from '../api-state';
import StatusBadge from './status-badge';
import { toTeacherCourse } from './teacher-api';
import { staffUi } from '../ui-styles';

export default function TeacherOverviewPage() {
  const [language] = useAppLanguage();
  const coursesQuery = useBackendQuery<TeacherCourseDto[]>('courses/mine');
  const permissionQuery = useBackendQuery<TeacherPermissionDto | null>('teacher-permissions/me');

  if (!coursesQuery.data) {
    return (
      <main className={staffUi.page}>
        <ApiState loading={coursesQuery.loading} error={coursesQuery.error} />
      </main>
    );
  }

  const courses = coursesQuery.data.map((course) => toTeacherCourse(course, language));
  const permission = permissionQuery.data;
  const draftCount = courses.filter((c) => c.status === 'DRAFT' || c.status === 'REJECTED').length;
  const reviewCount = courses.filter((c) => c.status === 'SUBMITTED').length;
  const publishedCount = courses.filter((c) => c.status === 'PUBLISHED').length;
  const canCreateCourse = permission?.status === 'APPROVED';

  return (
    <main className={staffUi.page}>
      {/* Header Banner */}
      <header className="mb-8 flex flex-col gap-6 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-blue-600 uppercase">
            <span className="size-2 rounded-full bg-blue-600 animate-pulse" />
            Course Studio
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Teacher Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Author curriculum content, configure required assessments, and track course version reviews.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href={canCreateCourse ? '/teacher/courses/new' : '/teacher/permission'}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30 active:translate-y-0"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {canCreateCourse ? 'Create New Course' : 'Request Teaching Permission'}
          </Link>
        </div>
      </header>

      {/* Permission Status Alert */}
      <section aria-labelledby="permission-heading" className="mb-8">
        <div
          className={`flex flex-col gap-4 rounded-2xl border p-5 transition sm:flex-row sm:items-center sm:justify-between ${
            canCreateCourse
              ? 'border-emerald-200/80 bg-gradient-to-r from-emerald-50/80 to-teal-50/50'
              : 'border-amber-200/80 bg-gradient-to-r from-amber-50/80 to-orange-50/50'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`grid size-10 shrink-0 place-items-center rounded-xl font-bold text-white shadow-xs ${
                canCreateCourse ? 'bg-emerald-600' : 'bg-amber-600'
              }`}
            >
              {canCreateCourse ? '✓' : '!'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="permission-heading" className="text-sm font-bold text-slate-900">
                  Teaching Permission
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.68rem] font-bold uppercase ${
                    canCreateCourse ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {permissionQuery.loading ? 'Checking…' : permission?.status ?? 'Not Requested'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600">
                {canCreateCourse
                  ? 'Your teaching permission is active. You can create new courses and submit drafts for Approver review.'
                  : 'You must have approved teaching permission before creating and publishing courses.'}
              </p>
            </div>
          </div>
          <Link
            href="/teacher/permission"
            className={`inline-flex shrink-0 items-center gap-1 text-xs font-semibold hover:underline ${
              canCreateCourse ? 'text-emerald-700' : 'text-amber-800'
            }`}
          >
            {canCreateCourse ? 'View Permission Details' : 'Request Permission Now'} →
          </Link>
        </div>
      </section>

      {/* Metric Lifecycle Cards */}
      <section aria-label="Course Lifecycle Totals" className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Course Lifecycle</h2>
          <span className="text-xs text-slate-500">{courses.length} total courses</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Drafts Card */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-amber-700 uppercase">Needs Attention</span>
              <div className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-600/20 group-hover:bg-amber-100">
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
              </div>
            </div>
            <div className="my-4">
              <strong className="text-4xl font-bold tracking-tight text-slate-900">{draftCount}</strong>
              <p className="mt-1 text-xs text-slate-500">Draft or rejected versions awaiting edits</p>
            </div>
            <Link
              href="/teacher/courses"
              className="inline-flex items-center text-xs font-semibold text-amber-700 hover:underline"
            >
              Manage drafts →
            </Link>
          </div>

          {/* In Review Card */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-sky-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-sky-700 uppercase">Under Review</span>
              <div className="grid size-9 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-600/20 group-hover:bg-sky-100">
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
            </div>
            <div className="my-4">
              <strong className="text-4xl font-bold tracking-tight text-slate-900">{reviewCount}</strong>
              <p className="mt-1 text-xs text-slate-500">Submitted to Approver decision queue</p>
            </div>
            <Link
              href="/teacher/courses"
              className="inline-flex items-center text-xs font-semibold text-sky-700 hover:underline"
            >
              Track review status →
            </Link>
          </div>

          {/* Published Card */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-emerald-700 uppercase">Published</span>
              <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/20 group-hover:bg-emerald-100">
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
            </div>
            <div className="my-4">
              <strong className="text-4xl font-bold tracking-tight text-slate-900">{publishedCount}</strong>
              <p className="mt-1 text-xs text-slate-500">Live and available to eligible students</p>
            </div>
            <Link
              href="/teacher/courses"
              className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:underline"
            >
              View catalog →
            </Link>
          </div>
        </div>
      </section>

      {/* Mandatory Assessment Policy Notice */}
      <section className="mb-10 rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
        <div className="flex items-start gap-3.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-white shadow-xs">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-950">Institutional Assessment Standards</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-blue-800/90">
              Both a <strong>Pre-Test</strong> (gatekeeping quiz) and a <strong>Post-Test</strong> (80% passing grade requirement) are <strong>mandatory</strong> for every course version. Each quiz must contain at least 1 question with ≥ 2 options and 1 correct answer before submission will be enabled.
            </p>
          </div>
        </div>
      </section>

      {/* Recent Courses List */}
      <section aria-labelledby="recent-courses-heading">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 id="recent-courses-heading" className="text-lg font-bold tracking-tight text-slate-900">
              Recent Courses
            </h2>
            <p className="text-xs text-slate-500">Pick up where you left off or create a new revision</p>
          </div>
          <Link
            href="/teacher/courses"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
          >
            View all courses →
          </Link>
        </div>

        {courses.length ? (
          <div className="grid gap-3">
            {courses.slice(0, 4).map((course) => (
              <Link
                key={course.id}
                href={`/teacher/courses/${course.id}`}
                className="group flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 font-mono text-xs font-bold text-blue-700 ring-1 ring-blue-600/10 group-hover:ring-blue-600/30">
                    V{course.version}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600">
                      {course.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                        {course.category}
                      </span>
                      <span>•</span>
                      <span>Updated {course.updated}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <StatusBadge status={course.status} />
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                    <span>Edit course</span>
                    <span aria-hidden="true">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-white text-slate-400 shadow-xs">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-800">No courses created yet</h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {canCreateCourse
                ? 'Get started by creating your first course and structuring its lessons and quizzes.'
                : 'Submit a teaching permission request to begin authoring courses on Institute X.'}
            </p>
            {canCreateCourse ? (
              <Link
                href="/teacher/courses/new"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
              >
                Create your first course
              </Link>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
