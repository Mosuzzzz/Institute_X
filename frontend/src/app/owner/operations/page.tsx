import { activityLog, assessmentOutcomes, peakUsage } from '../owner-data';

const maxAccesses = Math.max(...peakUsage.map((point) => point.accesses));

export default function OwnerOperationsPage() {
  return (
    <main className="teacher-main owner-main">
      <header className="teacher-page-heading"><div><p className="eyebrow">Platform signals</p><h1>Operations</h1><p>Inspect hourly demand, assessment outcomes and significant platform activity.</p></div><span className="owner-live-label"><i />Demo snapshot</span></header>
      <section className="owner-operations-grid">
        <article className="owner-panel owner-traffic-panel owner-traffic-wide"><header><div><p className="eyebrow">Hourly activity</p><h2>Content accesses</h2></div><span>08:00–18:00</span></header><div className="owner-bar-chart">{peakUsage.map((point) => <div key={point.hour}><span style={{ height: `${Math.max(8, (point.accesses / maxAccesses) * 100)}%` }}><b>{point.accesses}</b></span><small>{point.hour}:00</small></div>)}</div><footer><strong>1,120</strong><span>Peak accesses at 15:00</span></footer></article>
        <article className="owner-panel owner-outcome-panel owner-outcome-detail"><header><div><p className="eyebrow">Learning signal</p><h2>Post-Test results</h2></div></header><div className="owner-donut" style={{ background: `conic-gradient(#0b5b73 0 ${assessmentOutcomes.passRate}%, #d6dbe2 ${assessmentOutcomes.passRate}% 100%)` }}><span><strong>{assessmentOutcomes.passRate}%</strong><small>pass</small></span></div><dl><div><dt>Pass</dt><dd>{assessmentOutcomes.pass.toLocaleString()}</dd></div><div><dt>Not pass</dt><dd>{assessmentOutcomes.notPass.toLocaleString()}</dd></div></dl></article>
      </section>
      <section className="owner-list-section"><div className="teacher-section-heading"><div><p className="eyebrow">System timeline</p><h2>Recent activity</h2></div><span>Demo data</span></div><div className="owner-activity-list">{activityLog.map((item) => <article key={`${item.time}-${item.event}`}><time>{item.time}</time><span /><div><strong>{item.event}</strong><p>{item.actor} · {item.target}</p></div></article>)}</div></section>
      <p className="teacher-demo-note">Traffic and assessment shapes match <code>GET /api/owner/dashboard</code>. The activity timeline needs a future audit-log endpoint.</p>
    </main>
  );
}
