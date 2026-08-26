import Link from 'next/link';
import { assessmentOutcomes, ownerOverview, peakUsage, popularCourses } from './owner-data';

const maxAccesses = Math.max(...peakUsage.map((point) => point.accesses));

export default function OwnerOverviewPage() {
  return (
    <main className="teacher-main owner-main">
      <header className="teacher-page-heading"><div><p className="eyebrow">System evidence</p><h1>Operational overview</h1><p>A single view of platform reach, learning demand and assessment outcomes.</p></div><span className="owner-live-label"><i />Demo snapshot · 26 Aug 2026</span></header>

      <section className="owner-metric-strip" aria-label="Platform totals">
        {ownerOverview.map((metric, index) => <article key={metric.label}><span>0{index + 1}</span><p>{metric.label}</p><strong>{metric.value}</strong><div><b>{metric.change}</b><small>{metric.detail}</small></div></article>)}
      </section>

      <section className="owner-overview-grid">
        <article className="owner-panel owner-traffic-panel">
          <header><div><p className="eyebrow">Demand trace</p><h2>Accesses by hour</h2></div><Link href="/owner/operations">Full operations →</Link></header>
          <div className="owner-bar-chart" aria-label="Hourly content accesses">
            {peakUsage.map((point) => <div key={point.hour}><span style={{ height: `${Math.max(8, (point.accesses / maxAccesses) * 100)}%` }}><b>{point.accesses}</b></span><small>{point.hour}:00</small></div>)}
          </div>
          <footer><strong>15:00</strong><span>Peak window · 1,120 accesses</span></footer>
        </article>

        <article className="owner-panel owner-outcome-panel">
          <header><div><p className="eyebrow">Assessment health</p><h2>Post-Test outcomes</h2></div></header>
          <strong>{assessmentOutcomes.passRate}%</strong><p>Pass rate across recorded Post-Test attempts.</p>
          <div className="owner-outcome-track"><span style={{ width: `${assessmentOutcomes.passRate}%` }} /></div>
          <dl><div><dt>Pass</dt><dd>{assessmentOutcomes.pass.toLocaleString()}</dd></div><div><dt>Not pass</dt><dd>{assessmentOutcomes.notPass.toLocaleString()}</dd></div></dl>
        </article>
      </section>

      <section className="owner-popular-section">
        <div className="teacher-section-heading"><div><p className="eyebrow">Course demand</p><h2>Most enrolled courses</h2></div><Link href="/owner/courses">Course portfolio →</Link></div>
        <div className="owner-course-table"><header><span>Course</span><span>Category</span><span>Enrollments</span><span>Completion</span></header>{popularCourses.slice(0, 4).map((course, index) => <div key={course.id}><span className="owner-rank">0{index + 1}</span><div><strong>{course.title}</strong><small>{course.id}</small></div><span>{course.category}</span><b>{course.enrollments}</b><div className="owner-table-progress"><span><i style={{ width: `${course.completion}%` }} /></span><small>{course.completion}%</small></div></div>)}</div>
      </section>
      <p className="teacher-demo-note">Demo owner metrics shaped to match <code>GET /api/owner/dashboard</code>. Connect the authenticated endpoint to replace this snapshot.</p>
    </main>
  );
}
