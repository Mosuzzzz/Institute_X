'use client';

import Link from 'next/link';
import type { OwnerDashboardDto } from '../../lib/backend-api';
import { useBackendQuery } from '../../lib/use-backend-query';
import ApiState from '../api-state';
import { ownerUi, staffUi } from '../ui-styles';

export default function OwnerOverviewPage() {
  const { data, error, loading } = useBackendQuery<OwnerDashboardDto>('owner/dashboard');
  if (!data) return <main className={staffUi.page}><ApiState loading={loading} error={error} /></main>;

  const metrics = [
    ['Active users', data.overview.users, 'Across all application roles'],
    ['Courses', data.overview.courses, 'All Course records'],
    ['Enrollments', data.overview.enrollments, 'Recorded enrollments'],
    ['Content accesses', data.overview.accesses, 'Recorded entry events'],
    ['Assessment attempts', data.overview.assessmentAttempts, 'Submitted attempts'],
  ] as const;
  const usage = [...data.peakUsage].sort((left, right) => left.hour - right.hour);
  const maxAccesses = Math.max(1, ...usage.map((point) => point.accesses));
  const peak = data.peakUsage.reduce((best, point) => point.accesses > best.accesses ? point : best, { hour: 0, accesses: 0 });
  const decided = data.postTestResults.pass + data.postTestResults.notPass;
  const passRate = decided === 0 ? 0 : (data.postTestResults.pass / decided) * 100;

  return (
    <main className={staffUi.page}>
      <header className={staffUi.heading}><div><p className={staffUi.eyebrow}>System evidence</p><h1>Operational overview</h1><p>A single view of platform reach, learning demand and assessment outcomes.</p></div><span className={ownerUi.liveLabel}><i />Live backend data</span></header>
      <section className={ownerUi.metricStrip} aria-label="Platform totals">{metrics.map(([label, value, detail], index) => <article key={label}><span>0{index + 1}</span><p>{label}</p><strong>{value.toLocaleString()}</strong><div><small>{detail}</small></div></article>)}</section>
      <section className={ownerUi.overviewGrid}>
        <article className={`${ownerUi.panel} ${ownerUi.traffic}`}><header><div><p className={staffUi.eyebrow}>Demand trace</p><h2>Accesses by hour</h2></div><Link href="/owner/operations">Full operations →</Link></header>{usage.length ? <div className={ownerUi.barChart} aria-label="Hourly content accesses">{usage.map((point) => <div key={point.hour}><span style={{ height: `${Math.max(8, (point.accesses / maxAccesses) * 100)}%` }}><b>{point.accesses}</b></span><small>{String(point.hour).padStart(2, '0')}:00</small></div>)}</div> : <p className={staffUi.empty}>No access events recorded yet.</p>}<footer><strong>{String(peak.hour).padStart(2, '0')}:00</strong><span>Peak window · {peak.accesses.toLocaleString()} accesses</span></footer></article>
        <article className={`${ownerUi.panel} ${ownerUi.outcome}`}><header><div><p className={staffUi.eyebrow}>Assessment health</p><h2>Post-Test outcomes</h2></div></header><strong>{passRate.toFixed(1)}%</strong><p>Pass rate across recorded Post-Test attempts.</p><div className={ownerUi.outcomeTrack}><span style={{ width: `${passRate}%` }} /></div><dl><div><dt>Pass</dt><dd>{data.postTestResults.pass.toLocaleString()}</dd></div><div><dt>Not pass</dt><dd>{data.postTestResults.notPass.toLocaleString()}</dd></div></dl></article>
      </section>
      <section className={ownerUi.listSection}><div className={staffUi.sectionHeading}><div><p className={staffUi.eyebrow}>Course demand</p><h2>Most enrolled courses</h2></div><Link href="/owner/courses">Course portfolio →</Link></div>{data.popularCourses.length ? <div className={ownerUi.courseTable}><header><span>Course</span><span>Source</span><span>Enrollments</span><span>Rank</span></header>{data.popularCourses.slice(0, 5).map((course, index) => <div key={course.courseId}><span className={ownerUi.rank}>{String(index + 1).padStart(2, '0')}</span><div><strong>{course.title}</strong><small>{course.courseId}</small></div><span>Institute X</span><b>{course.enrollments}</b><div><small>#{index + 1}</small></div></div>)}</div> : <p className={staffUi.empty}>No course enrollments recorded yet.</p>}</section>
    </main>
  );
}
