'use client';

import type { ExecutiveLearningAnalyticsDto } from '../../lib/backend-api';
import { useBackendQuery } from '../../lib/use-backend-query';
import ApiState from '../api-state';

const score = (value: number | null) => value === null ? '—' : `${value.toFixed(1)}%`;

export default function ExecutiveLearningAnalytics() {
  const { data, loading, error } = useBackendQuery<ExecutiveLearningAnalyticsDto>('executive/learning-analytics');
  if (!data) return <ApiState loading={loading} error={error} />;
  return <section className="mt-8 grid gap-6" aria-label="Learning performance">
    <header><h2 className="text-xl font-semibold text-slate-900">Learning outcomes</h2><p className="mt-1 text-sm text-slate-500">Completion means an enrolled student has passed a Post-Test. Repeat passes count once per course.</p></header>
    <div className="grid gap-4 sm:grid-cols-3">{[
      ['Completion rate', `${data.summary.completionRate.toFixed(1)}%`, `${data.summary.completedEnrollments} of ${data.summary.enrollments} enrollments`],
      ['Pre-Test average', score(data.summary.preTestAverage), 'All submitted Pre-Test attempts'],
      ['Post-Test average', score(data.summary.postTestAverage), 'All submitted Post-Test attempts, including retakes'],
    ].map(([label, value, hint]) => <article className="rounded-2xl border border-slate-200 bg-white p-5" key={label}><p className="text-sm text-slate-500">{label}</p><strong className="my-2 block text-2xl text-slate-900">{value}</strong><small className="text-slate-500">{hint}</small></article>)}</div>
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><h3 className="border-b border-slate-200 p-5 font-semibold">Course performance</h3><div className="overflow-x-auto"><table className="w-full min-w-180 text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{['Course', 'Enrollments', 'Completed', 'Completion', 'Pre-Test', 'Post-Test', 'Accesses'].map(label => <th className="p-4 font-medium" key={label}>{label}</th>)}</tr></thead><tbody>{data.courses.map(course => <tr className="border-t border-slate-100" key={course.courseId}><td className="p-4 font-medium">{course.title}</td><td className="p-4">{course.enrollments}</td><td className="p-4">{course.completed}</td><td className="p-4">{course.completionRate.toFixed(1)}%</td><td className="p-4">{score(course.preTestAverage)}</td><td className="p-4">{score(course.postTestAverage)}</td><td className="p-4">{course.accesses}</td></tr>)}</tbody></table>{!data.courses.length ? <p className="p-5 text-sm text-slate-500">No courses yet.</p> : null}</div></article>
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><h3 className="border-b border-slate-200 p-5 font-semibold">Performance by major</h3><p className="px-5 pt-4 text-xs text-slate-500">Scores are averaged per enrollment before grouping by the student’s current major.</p><div className="overflow-x-auto"><table className="w-full min-w-160 text-left text-sm"><thead className="text-slate-500"><tr>{['Major', 'Enrollments', 'Completed', 'Completion', 'Pre-Test', 'Post-Test'].map(label => <th className="p-4 font-medium" key={label}>{label}</th>)}</tr></thead><tbody>{data.byMajor.map(major => <tr className="border-t border-slate-100" key={major.majorCode ?? 'none'}><td className="p-4">{major.majorCode ? `${major.majorCode} — ${major.majorName}` : 'No major assigned'}</td><td className="p-4">{major.enrollments}</td><td className="p-4">{major.completed}</td><td className="p-4">{major.completionRate.toFixed(1)}%</td><td className="p-4">{score(major.preTestAverage)}</td><td className="p-4">{score(major.postTestAverage)}</td></tr>)}</tbody></table>{!data.byMajor.length ? <p className="p-5 text-sm text-slate-500">No enrollment activity yet.</p> : null}</div></article>
  </section>;
}
