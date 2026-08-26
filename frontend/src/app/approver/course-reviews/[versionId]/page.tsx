import Link from 'next/link';
import { notFound } from 'next/navigation';
import { courseReviews, reviewChecklist } from '../../approver-data';

export default async function CourseReviewPage({ params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  const review = courseReviews.find((item) => item.id === versionId);
  if (!review) notFound();

  return (
    <main className="teacher-main approver-main review-detail-page">
      <header className="review-detail-header"><div><Link className="teacher-back-link" href="/approver/course-reviews">← Course reviews</Link><p className="eyebrow">Submitted Version {review.version}</p><h1>{review.title}</h1><p>{review.teacher} · {review.category} · Submitted {review.submitted}</p></div><span>{review.waiting} in queue</span></header>
      <div className="review-detail-layout">
        <section className="review-evidence"><header><h2>Review evidence</h2><p>Confirm each requirement before recording a decision.</p></header><ol>{reviewChecklist.map((item, index) => <li key={item.label}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.label}</strong><p>{item.detail}</p></div><b>Ready</b></li>)}</ol></section>
        <aside className="review-decision-panel"><p className="eyebrow">Final decision</p><h2>Approve or return?</h2><p>Approval publishes this Version automatically. A rejection must include a clear correction comment.</p><label>Review comment<textarea rows={6} placeholder="Required when rejecting this Version" /></label><div><button type="button">Reject Version</button><button type="button">Approve & publish</button></div><small>Demo controls — no backend decision will be recorded.</small></aside>
      </div>
    </main>
  );
}
