import Link from 'next/link';
import { courseReviews } from '../approver-data';

export default function CourseReviewsPage() {
  return (
    <main className="teacher-main approver-main">
      <header className="teacher-page-heading"><div><p className="eyebrow">Publication queue</p><h1>Course reviews</h1><p>Inspect submitted Versions before approval automatically publishes them.</p></div><span className="queue-count">{courseReviews.length} pending</span></header>
      <section className="review-queue-table" aria-label="Submitted Course Versions">
        <header><span>Course Version</span><span>Teacher</span><span>Submitted</span><span>Waiting</span><span /></header>
        {courseReviews.map((review) => <Link key={review.id} href={`/approver/course-reviews/${review.id}`}><div><strong>{review.title}</strong><span>{review.category} · Version {review.version}</span></div><span>{review.teacher}</span><span>{review.submitted}</span><strong>{review.waiting}</strong><b>Review →</b></Link>)}
      </section>
      <p className="teacher-demo-note">Demo data shown until connected to `GET /api/course-versions/pending-review`.</p>
    </main>
  );
}
