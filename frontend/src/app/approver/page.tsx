import Link from 'next/link';
import { courseReviews, permissionRequests } from './approver-data';

export default function ApproverOverviewPage() {
  return (
    <main className="teacher-main approver-main">
      <header className="teacher-page-heading"><div><p className="eyebrow">Decision queues</p><h1>Review overview</h1><p>Work oldest-first, inspect the evidence and record a clear decision for every request.</p></div><span className="approver-date">26 August 2026</span></header>
      <section className="approval-queue-summary" aria-label="Pending review totals">
        <Link href="/approver/teacher-requests"><span>01</span><div><p>Teacher permissions</p><strong>{permissionRequests.length} pending</strong><small>Oldest waiting {permissionRequests[0]?.waiting}</small></div><b>→</b></Link>
        <Link href="/approver/course-reviews"><span>02</span><div><p>Course Versions</p><strong>{courseReviews.length} pending</strong><small>Oldest waiting {courseReviews[0]?.waiting}</small></div><b>→</b></Link>
      </section>
      <section className="approval-worklist"><div className="teacher-section-heading"><div><p className="eyebrow">Next decisions</p><h2>Oldest items first</h2></div><span>Demo data</span></div>
        <div className="approval-mixed-list">
          <Link href="/approver/teacher-requests"><span className="approval-type">Permission</span><div><strong>{permissionRequests[0]?.teacher}</strong><small>{permissionRequests[0]?.email}</small></div><time>{permissionRequests[0]?.waiting}</time><b>Review →</b></Link>
          <Link href={`/approver/course-reviews/${courseReviews[0]?.id}`}><span className="approval-type course">Course V{courseReviews[0]?.version}</span><div><strong>{courseReviews[0]?.title}</strong><small>{courseReviews[0]?.teacher}</small></div><time>{courseReviews[0]?.waiting}</time><b>Review →</b></Link>
        </div>
      </section>
      <p className="teacher-demo-note">Demo review queues — replace with the authenticated pending-review endpoints during API integration.</p>
    </main>
  );
}
