'use client';

import type { ExecutiveLearningAnalyticsDto } from '../../lib/backend-api';
import { useBackendQuery } from '../../lib/use-backend-query';
import ApiState from '../api-state';
import { useAppLanguage } from '../../lib/language';
import { translateMajor } from '../../lib/reference-translations';
import { useUiTranslation } from "../../lib/ui-translations";


const score = (value: number | null) => value === null ? '—' : `${value.toFixed(1)}%`;

export default function ExecutiveLearningAnalytics() {
  const t = useUiTranslation();
  const [language] = useAppLanguage();
  const { data, loading, error } = useBackendQuery<ExecutiveLearningAnalyticsDto>('executive/learning-analytics');
  if (!data) return <ApiState loading={loading} error={error} />;
  return <section className="mt-8 grid gap-6" aria-label={t("Learning performance")}>
    <header><h2 className="text-xl font-semibold text-slate-900">{t("Learning outcomes")}</h2><p className="mt-1 text-sm text-slate-600">{t("Completion means an enrolled student has passed a Post-Test. Repeat passes count once per course.")}</p></header>
    <div className="grid gap-4 sm:grid-cols-3">{[
      [t("Completion rate"), `${data.summary.completionRate.toFixed(1)}%`, t('{count} of {total} enrollments', { count: data.summary.completedEnrollments, total: data.summary.enrollments })],
      [t("Pre-Test average"), score(data.summary.preTestAverage), t("All submitted Pre-Test attempts")],
      [t("Post-Test average"), score(data.summary.postTestAverage), t("All submitted Post-Test attempts, including retakes")],
    ].map(([label, value, hint]) => <article className="rounded-panel border border-slate-200 bg-white p-5" key={label}><p className="text-sm text-slate-600">{t(label)}</p><strong className="my-2 block text-2xl text-slate-900">{value}</strong><small className="text-slate-600">{t(hint)}</small></article>)}</div>
    <article className="overflow-hidden rounded-panel border border-slate-200 bg-white"><h3 className="border-b border-slate-200 p-5 font-semibold">{t("Course performance")}</h3><div className="overflow-x-auto"><table className="w-full min-w-180 text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr>{[t("Course"), t("Enrollments"), t("Completed"), t("Completion"), t("Pre-Test"), t("Post-Test"), t("Accesses")].map(label => <th className="p-4 font-medium" key={label}>{t(label)}</th>)}</tr></thead><tbody>{data.courses.map(course => <tr className="border-t border-slate-100" key={course.courseId}><td className="p-4 font-medium">{course.title}</td><td className="p-4">{course.enrollments}</td><td className="p-4">{course.completed}</td><td className="p-4">{course.completionRate.toFixed(1)}%</td><td className="p-4">{score(course.preTestAverage)}</td><td className="p-4">{score(course.postTestAverage)}</td><td className="p-4">{course.accesses}</td></tr>)}</tbody></table>{!data.courses.length ? <p className="p-5 text-sm text-slate-600">{t("No courses yet.")}</p> : null}</div></article>
    <article className="overflow-hidden rounded-panel border border-slate-200 bg-white"><h3 className="border-b border-slate-200 p-5 font-semibold">{t("Performance by major")}</h3><p className="px-5 pt-4 text-xs text-slate-600">{t("Scores are averaged per enrollment before grouping by the student’s current major.")}</p><div className="overflow-x-auto"><table className="w-full min-w-160 text-left text-sm"><thead className="text-slate-600"><tr>{[t("Major"), t("Enrollments"), t("Completed"), t("Completion"), t("Pre-Test"), t("Post-Test")].map(label => <th className="p-4 font-medium" key={label}>{t(label)}</th>)}</tr></thead><tbody>{data.byMajor.map(major => <tr className="border-t border-slate-100" key={major.majorCode ?? 'none'}><td className="p-4">{major.majorCode ? `${major.majorCode} — ${translateMajor({ code: major.majorCode, name: major.majorName ?? major.majorCode }, language)}` : t("No major assigned")}</td><td className="p-4">{major.enrollments}</td><td className="p-4">{major.completed}</td><td className="p-4">{major.completionRate.toFixed(1)}%</td><td className="p-4">{score(major.preTestAverage)}</td><td className="p-4">{score(major.postTestAverage)}</td></tr>)}</tbody></table>{!data.byMajor.length ? <p className="p-5 text-sm text-slate-600">{t("No enrollment activity yet.")}</p> : null}</div></article>
  </section>;
}
