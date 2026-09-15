'use client';

import { backendApi } from '../../../lib/backend-api';
import { useAppLanguage } from '../../../lib/language';
import { useBackendQuery } from '../../../lib/use-backend-query';
import ApiState from '../../api-state';
import { staffUi } from '../../ui-styles';
import { useUiTranslation } from '../../../lib/ui-translations';

type Report = { id: string; reason: string; createdAt: string; reviewedAt: string | null; reporter: { fullName: string; universityEmail: string }; course: { id: string; archivedAt: string | null; versions: Array<{ title: string }> } };

export default function CourseReportsPage() {
  const t = useUiTranslation();
  const [language] = useAppLanguage();
  const reports = useBackendQuery<Report[]>('course-reports');
  if (!reports.data) return <main data-ui="page" className={staffUi.page}><ApiState loading={reports.loading} error={reports.error} /></main>;
  return <main data-ui="page" className={staffUi.page}>
    <h1>{t('Course reports')}</h1><p className="mt-2 text-sm text-muted">{t('Reports submitted by users for Approver review.')}</p>
    <div className="mt-8 grid gap-4">{reports.data.map(report => <article key={report.id} className="rounded-panel border border-line bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">{report.course.versions[0]?.title ?? t('Untitled course')}</h2><p className="text-sm text-muted">{report.reporter.fullName} · {report.reporter.universityEmail}</p></div><time className="text-sm text-muted">{new Date(report.createdAt).toLocaleString(language)}</time></div><p className="mt-4 whitespace-pre-wrap">{report.reason}</p>{report.reviewedAt ? <p className="mt-4 text-sm text-emerald-700">{t('Reviewed')}</p> : <button className="mt-4 rounded-control bg-action px-4 py-2 text-sm font-semibold text-white" onClick={async () => { await backendApi(`course-reports/${report.id}/review`, { method: 'PATCH' }); await reports.refresh(); }}>{t('Mark as reviewed')}</button>}</article>)}{!reports.data.length ? <p className="py-12 text-center text-muted">{t('No course reports.')}</p> : null}</div>
  </main>;
}
