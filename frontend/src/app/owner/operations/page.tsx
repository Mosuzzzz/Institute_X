'use client';

import type { OwnerActivityDto, OwnerDashboardDto } from '../../../lib/backend-api';
import { useBackendQuery } from '../../../lib/use-backend-query';
import ApiState from '../../api-state';
import { ownerUi, staffUi } from '../../ui-styles';

export default function OwnerOperationsPage() {
  const { data, error, loading } = useBackendQuery<OwnerDashboardDto>('owner/dashboard');
  const activity = useBackendQuery<OwnerActivityDto[]>('owner/activity');
  if (!data) return <main className={staffUi.page}><ApiState loading={loading} error={error} /></main>;

  const usage = [...data.peakUsage].sort((left, right) => left.hour - right.hour);
  const maxAccesses = Math.max(1, ...usage.map((point) => point.accesses));
  const peak = data.peakUsage.reduce((best, point) => point.accesses > best.accesses ? point : best, { hour: 0, accesses: 0 });
  const decided = data.postTestResults.pass + data.postTestResults.notPass;
  const passRate = decided === 0 ? 0 : (data.postTestResults.pass / decided) * 100;

  return (
    <main className={staffUi.page}>
      <header className={staffUi.heading}><div><p className={staffUi.eyebrow}>Platform signals</p><h1>Operations</h1><p>Inspect hourly demand, assessment outcomes and significant platform activity.</p></div><span className={ownerUi.liveLabel}><i />Live backend data</span></header>
      <section className={`${ownerUi.overviewGrid} !grid-cols-[minmax(0,1.45fr)_minmax(300px,.55fr)] max-[900px]:!grid-cols-1`}>
        <article className={`${ownerUi.panel} ${ownerUi.traffic}`}><header><div><p className={staffUi.eyebrow}>Hourly activity</p><h2>Content accesses</h2></div><span>Asia/Bangkok</span></header>{usage.length ? <div className={ownerUi.barChart}>{usage.map((point) => <div key={point.hour}><span style={{ height: `${Math.max(8, (point.accesses / maxAccesses) * 100)}%` }}><b>{point.accesses}</b></span><small>{String(point.hour).padStart(2, '0')}:00</small></div>)}</div> : <p className={staffUi.empty}>No access events recorded yet.</p>}<footer><strong>{peak.accesses.toLocaleString()}</strong><span>Peak accesses at {String(peak.hour).padStart(2, '0')}:00</span></footer></article>
        <article className={`${ownerUi.panel} ${ownerUi.outcome}`}><header><div><p className={staffUi.eyebrow}>Learning signal</p><h2>Post-Test results</h2></div></header><div className={ownerUi.donut} style={{ background: `conic-gradient(#0b5b73 0 ${passRate}%, #d6dbe2 ${passRate}% 100%)` }}><span><strong>{passRate.toFixed(1)}%</strong><small>pass</small></span></div><dl><div><dt>Pass</dt><dd>{data.postTestResults.pass.toLocaleString()}</dd></div><div><dt>Not pass</dt><dd>{data.postTestResults.notPass.toLocaleString()}</dd></div></dl></article>
      </section>
      <section className={ownerUi.listSection}><div className={staffUi.sectionHeading}><div><p className={staffUi.eyebrow}>System timeline</p><h2>Recent activity</h2></div></div>{activity.data ? <div className={ownerUi.activity}>{activity.data.map((item) => <article key={item.id}><time dateTime={item.occurredAt}>{new Date(item.occurredAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time><span /><div><strong>{item.type.replaceAll('_', ' ')}</strong><p>{item.actor} · {item.detail}</p></div></article>)}</div> : <ApiState loading={activity.loading} error={activity.error} />}</section>
    </main>
  );
}
