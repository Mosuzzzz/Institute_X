'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { TeacherCourseDto, TeacherPermissionDto } from '../../../lib/backend-api';
import { useBackendQuery } from '../../../lib/use-backend-query';
import ApiState from '../../api-state';
import StatusBadge from '../status-badge';
import { toTeacherCourse } from '../teacher-api';
import { useAppLanguage } from '../../../lib/language';
import { staffUi } from '../../ui-styles';

type SortOrder = 'newest' | 'oldest' | 'title';

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="m16.5 16.5 4 4" />
    </svg>
  );
}

export default function TeacherCoursesPage() {
  const [language] = useAppLanguage();
  const [query, setQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const { data, error, loading } = useBackendQuery<TeacherCourseDto[]>('courses/mine');
  const permission = useBackendQuery<TeacherPermissionDto | null>('teacher-permissions/me');

  const courses = useMemo(() => {
    if (!data) return [];
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filtered = data
      .map((course) => toTeacherCourse(course, language))
      .filter((course) =>
        [course.title, course.category, course.status, course.language]
          .join(' ')
          .toLocaleLowerCase()
          .includes(normalizedQuery),
      );

    return filtered.sort((left, right) => {
      if (sortOrder === 'title') return left.title.localeCompare(right.title);
      const difference = Date.parse(left.updated) - Date.parse(right.updated);
      return sortOrder === 'oldest' ? difference : -difference;
    });
  }, [data, language, query, sortOrder]);

  if (!data) {
    return (
      <main className={staffUi.page}>
        <ApiState loading={loading} error={error} />
      </main>
    );
  }

  const canCreateCourse = permission.data?.status === 'APPROVED';

  return (
    <main className="mx-auto w-[min(calc(100%-48px),1480px)] py-[clamp(40px,5vw,76px)] max-[700px]:w-[min(calc(100%-28px),760px)]">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#6d28d9] uppercase">Course authoring</p>
          <h1 className="mt-2 text-[clamp(2.2rem,4vw,4rem)] leading-none tracking-[-0.05em] text-[#292b3a]">Courses</h1>
          <p className="mt-3 text-sm text-[#6f7183]">Create, complete and manage every course version in one place.</p>
        </div>
        <Link
          className="inline-flex min-h-12 items-center justify-center rounded-sm bg-[#6d28d9] px-7 text-sm font-semibold text-white no-underline shadow-sm transition hover:bg-[#5b21b6]"
          href={canCreateCourse ? '/teacher/courses/new' : '/teacher/permission'}
        >
          {canCreateCourse ? 'New course' : 'Request teaching permission'}
        </Link>
      </header>

      <nav className="mt-12 flex min-h-14 items-end gap-8 border-b border-[#d9dbe5]" aria-label="Course workspace tabs">
        <span className="border-b-[3px] border-[#292b3a] px-1 pb-4 text-sm font-semibold text-[#292b3a]">Courses</span>
      </nav>

      <section className="mt-10 flex flex-wrap items-center gap-3" aria-label="Course filters">
        <label className="relative flex min-w-[min(100%,310px)] flex-1 sm:max-w-[360px]">
          <span className="sr-only">Search your courses</span>
          <input
            className="min-h-12 w-full border border-[#cfd2df] bg-white pr-14 pl-4 text-sm text-[#292b3a] outline-none transition placeholder:text-[#9093a5] focus:border-[#6d28d9] focus:ring-2 focus:ring-[#6d28d9]/15"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your courses"
            type="search"
            value={query}
          />
          <span className="absolute inset-y-0 right-0 grid w-12 place-items-center bg-[#6d28d9] text-white">
            <SearchIcon />
          </span>
        </label>
        <label>
          <span className="sr-only">Sort courses</span>
          <select
            className="min-h-12 cursor-pointer border border-[#6d28d9] bg-white px-4 text-sm font-semibold text-[#6d28d9] outline-none focus:ring-2 focus:ring-[#6d28d9]/15"
            onChange={(event) => setSortOrder(event.target.value as SortOrder)}
            value={sortOrder}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="title">Course title</option>
          </select>
        </label>
        <span className="ml-auto text-xs font-medium text-[#77798a]">
          {courses.length} {courses.length === 1 ? 'course' : 'courses'}
        </span>
      </section>

      {!canCreateCourse ? (
        <section className="mt-8 flex flex-wrap items-center justify-between gap-4 border border-[#e2d9b7] bg-[#fffaf0] px-5 py-4">
          <div>
            <strong className="text-sm text-[#4c4120]">Teaching permission is required</strong>
            <p className="mt-1 text-xs text-[#71663f]">An Approver must approve your request before you can create a new course.</p>
          </div>
          <Link className="text-sm font-semibold text-[#6d28d9] no-underline hover:underline" href="/teacher/permission">Open permission request →</Link>
        </section>
      ) : null}

      <section className="mt-8 grid gap-4" aria-label="Your courses">
        {courses.map((course, index) => (
          <Link
            className="group grid min-h-[150px] grid-cols-[160px_minmax(210px,0.9fr)_minmax(240px,1.2fr)_32px] items-center border border-[#d9dbe5] bg-white text-inherit no-underline transition hover:border-[#b8aacd] hover:shadow-[0_8px_24px_rgba(42,35,56,0.08)] max-[900px]:grid-cols-[120px_minmax(0,1fr)_32px] max-[900px]:py-4 max-[620px]:grid-cols-[84px_minmax(0,1fr)]"
            href={`/teacher/courses/${course.id}`}
            key={course.id}
          >
            <div className="grid h-full min-h-[148px] place-content-center bg-[#f3f3f6] text-center max-[900px]:min-h-[112px] max-[620px]:min-h-[84px]">
              <span className="text-3xl font-semibold text-[#6d28d9] max-[620px]:text-xl">
                {String(index + 1).padStart(2, '0')}
              </span>
              <small className="mt-1 text-[0.62rem] tracking-[0.12em] text-[#77798a] uppercase">Course</small>
            </div>
            <div className="min-w-0 px-6 py-5 max-[620px]:px-4">
              <h2 className="truncate text-lg font-semibold text-[#292b3a]">{course.title}</h2>
              <p className="mt-2 text-xs text-[#77798a]">{course.category} · {course.language}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <StatusBadge status={course.status} />
                <span className="text-xs text-[#77798a]">Version {course.version}</span>
                <span className="text-xs text-[#77798a]">Updated {course.updated}</span>
              </div>
            </div>
            <div className="px-6 max-[900px]:col-span-2 max-[900px]:col-start-2 max-[900px]:row-start-2 max-[900px]:pb-2 max-[620px]:col-span-2 max-[620px]:col-start-1 max-[620px]:px-4 max-[620px]:pt-4">
              <div className="flex items-center justify-between gap-4">
                <strong className="text-sm text-[#292b3a]">{course.completion < 100 ? 'Finish your course' : 'Course ready'}</strong>
                <span className="text-xs font-semibold text-[#6d28d9]">{course.completion}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden bg-[#d8d9e2]">
                <span className="block h-full bg-[#6d28d9] transition-all" style={{ width: `${course.completion}%` }} />
              </div>
              <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#77798a]">{course.note}</p>
            </div>
            <span className="pr-5 text-xl font-semibold text-[#6d28d9] transition group-hover:translate-x-1 max-[620px]:hidden">→</span>
          </Link>
        ))}
      </section>

      {!courses.length ? (
        <section className="mt-8 border border-dashed border-[#cfd2df] bg-white px-7 py-16 text-center">
          <h2 className="text-xl font-semibold text-[#292b3a]">{query ? 'No matching courses' : 'Create your first course'}</h2>
          <p className="mt-2 text-sm text-[#77798a]">
            {query ? 'Try another title, category, status or language.' : 'Start a Draft, add the required assessments and submit it for review.'}
          </p>
          {!query && canCreateCourse ? (
            <Link className="mt-6 inline-flex min-h-11 items-center bg-[#6d28d9] px-6 text-sm font-semibold text-white no-underline hover:bg-[#5b21b6]" href="/teacher/courses/new">New course</Link>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
