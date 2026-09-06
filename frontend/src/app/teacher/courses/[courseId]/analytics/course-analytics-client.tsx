'use client';

import Link from 'next/link';
import type { TeacherCourseAnalyticsDto } from '../../../../../lib/backend-api';
import { useBackendQuery } from '../../../../../lib/use-backend-query';
import ApiState from '../../../../api-state';

function score(value: number | null): string {
  return value === null ? 'No attempts' : `${value.toFixed(1)}%`;
}

export default function CourseAnalyticsClient({ courseId }: { courseId: string }) {
  const { data, error, loading } = useBackendQuery<TeacherCourseAnalyticsDto>(
    `teacher/courses/${courseId}/analytics`,
  );

  if (!data) {
    return <main className="mx-auto w-[min(calc(100%-48px),1200px)] py-14"><ApiState loading={loading} error={error} /></main>;
  }

  const cards = [
    ['Enrollments', data.enrollments],
    ['Course accesses', data.accesses],
    ['Pre-Test attempts', data.preTest.attempts],
    ['Post-Test attempts', data.postTest.attempts],
  ] as const;

  return (
    <main className="mx-auto w-[min(calc(100%-48px),1200px)] py-14">
      <Link className="text-sm font-semibold text-[#073d78]" href={`/teacher/courses/${courseId}`}>← Back to course</Link>
      <header className="mt-7 border-b border-slate-200 pb-7">
        <p className="text-xs font-bold tracking-[0.13em] text-[#6d28d9] uppercase">Course performance</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-slate-900">Analytics</h1>
        <p className="mt-2 text-sm text-slate-500">Enrollment, learning activity, assessment scores and pass outcomes.</p>
      </header>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Course totals">
        {cards.map(([label, value]) => (
          <article className="border border-slate-200 bg-white p-5" key={label}>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
            <strong className="mt-3 block text-4xl font-semibold text-slate-900">{value}</strong>
          </article>
        ))}
      </section>
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Pre-Test</h2>
          <dl className="mt-5 grid grid-cols-2 gap-4"><div><dt className="text-xs text-slate-500">Average score</dt><dd className="mt-1 text-2xl font-semibold">{score(data.preTest.averageScore)}</dd></div><div><dt className="text-xs text-slate-500">Attempts</dt><dd className="mt-1 text-2xl font-semibold">{data.preTest.attempts}</dd></div></dl>
        </article>
        <article className="border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Post-Test</h2>
          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4"><div><dt className="text-xs text-slate-500">Average</dt><dd className="mt-1 text-2xl font-semibold">{score(data.postTest.averageScore)}</dd></div><div><dt className="text-xs text-slate-500">Pass rate</dt><dd className="mt-1 text-2xl font-semibold">{data.postTest.passRate.toFixed(1)}%</dd></div><div><dt className="text-xs text-slate-500">Passed</dt><dd className="mt-1 text-2xl font-semibold text-emerald-700">{data.postTest.pass}</dd></div><div><dt className="text-xs text-slate-500">Not passed</dt><dd className="mt-1 text-2xl font-semibold text-rose-700">{data.postTest.notPass}</dd></div></dl>
        </article>
      </section>
    </main>
  );
}
