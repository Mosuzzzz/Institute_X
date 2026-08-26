'use client';

import Link from 'next/link';
import type { SubmittedVersionDto } from '../../../lib/backend-api';
import { useBackendQuery } from '../../../lib/use-backend-query';
import ApiState from '../../api-state';
import { formatSubmitted, formatWaiting } from '../approver-api';

export default function CourseReviewsPage() {
  const { data, error, loading } = useBackendQuery<SubmittedVersionDto[]>('course-versions/pending-review');
  if (!data) return <main className="teacher-main approver-main"><ApiState loading={loading} error={error} /></main>;
  return <main className="teacher-main approver-main"><header className="teacher-page-heading"><div><p className="eyebrow">Publication queue</p><h1>Course reviews</h1><p>Inspect submitted Versions before approval automatically publishes them.</p></div><span className="queue-count">{data.length} pending</span></header><section className="review-queue-table" aria-label="Submitted Course Versions"><header><span>Course Version</span><span>Teacher</span><span>Submitted</span><span>Waiting</span><span /></header>{data.map((review) => <Link key={review.id} href={`/approver/course-reviews/${review.id}`}><div><strong>{review.title}</strong><span>{review.course.allowedMajors.map(({ major }) => major.code).join(', ') || 'All'} · Version {review.versionNumber}</span></div><span>{review.course.teacher.fullName}</span><span>{formatSubmitted(review.submittedAt)}</span><strong>{formatWaiting(review.submittedAt)}</strong><b>Review →</b></Link>)}</section>{!data.length ? <p className="api-empty">No submitted Course Versions are waiting.</p> : null}<p className="teacher-demo-note">Live data from <code>GET /api/course-versions/pending-review</code>.</p></main>;
}
