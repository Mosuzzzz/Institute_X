'use client';

import Link from 'next/link';
import type { SubmittedVersionDto } from '../../../lib/backend-api';
import { useBackendQuery } from '../../../lib/use-backend-query';
import ApiState from '../../api-state';
import { formatSubmitted, formatWaiting } from '../approver-api';
import { staffUi } from '../../ui-styles';
import BootstrapIcon from '../../bootstrap-icon';

export default function CourseReviewsPage() {
  const { data, error, loading } = useBackendQuery<SubmittedVersionDto[]>('course-versions/pending-review');
  if (!data) return <main data-ui="page" className={staffUi.page}><ApiState loading={loading} error={error} /></main>;
  return <main data-ui="page" className={staffUi.page}><header className={staffUi.heading}><div><p className={staffUi.eyebrow}>Publication queue</p><h1>Course reviews</h1><p>Inspect submitted Versions before approval automatically publishes them.</p></div><span className={staffUi.count}>{data.length} pending</span></header><section className={`${staffUi.reviewTable} ui-review-table`} aria-label="Submitted Course Versions"><header><span>Course Version</span><span>Teacher</span><span>Submitted</span><span>Waiting</span><span /></header>{data.map((review) => <Link key={review.id} href={`/approver/course-reviews/${review.id}`}><div><strong>{review.title}</strong><span>{review.course.allowedMajors.map(({ major }) => major.code).join(', ') || 'All'} · Version {review.versionNumber}</span></div><span data-label="Teacher">{review.course.teacher.fullName}</span><span data-label="Submitted">{formatSubmitted(review.submittedAt)}</span><strong data-label="Waiting">{formatWaiting(review.submittedAt)}</strong><b>Review <BootstrapIcon name="arrow-right" /></b></Link>)}</section>{!data.length ? <p className={staffUi.empty}>No submitted Course Versions are waiting.</p> : null}</main>;
}
