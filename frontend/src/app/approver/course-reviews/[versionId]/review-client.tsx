'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { backendApi, type SubmittedVersionDto } from '../../../../lib/backend-api';
import { useBackendQuery } from '../../../../lib/use-backend-query';
import { useAppLanguage } from '../../../../lib/language';
import { translateMajor } from '../../../../lib/reference-translations';
import ApiState from '../../../api-state';
import { formatSubmitted, formatWaiting } from '../../approver-api';

export default function CourseReviewClient({ versionId }: { versionId: string }) {
  const router = useRouter();
  const [language] = useAppLanguage();
  const { data, error, loading } = useBackendQuery<SubmittedVersionDto[]>('course-versions/pending-review');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  if (!data) return <main className="teacher-main approver-main"><ApiState loading={loading} error={error} /></main>;
  const review = data.find((item) => item.id === versionId);
  if (!review) return <main className="teacher-main approver-main"><section className="api-state is-error"><strong>Version is no longer pending</strong><p>It may already have been reviewed.</p><Link href="/approver/course-reviews">Return to queue</Link></section></main>;
  const checklist = [
    { label: 'Learning content', detail: `${review.contentItems.length} ordered content items` },
    { label: 'Pre-Test', detail: `${review.quizzes.find((quiz) => quiz.quizType === 'PRE_TEST')?.questions.length ?? 0} questions` },
    { label: 'Post-Test', detail: `${review.quizzes.find((quiz) => quiz.quizType === 'POST_TEST')?.questions.length ?? 0} questions` },
    { label: 'Eligible Majors', detail: review.course.allowedMajors.map(({ major }) => `${major.code} — ${translateMajor(major, language)}`).join(', ') },
  ];
  const decide = async (decision: 'APPROVED' | 'REJECTED') => {
    if (decision === 'REJECTED' && !comment.trim()) { setActionError('A rejection comment is required.'); return; }
    setSaving(true); setActionError(null);
    try { await backendApi<void>(`course-versions/${versionId}/review`, { method: 'PATCH', body: JSON.stringify({ decision, comment: comment.trim() || undefined }) }); router.replace('/approver/course-reviews'); router.refresh(); }
    catch (requestError) { setActionError(requestError instanceof Error ? requestError.message : 'Unable to record review.'); setSaving(false); }
  };
  return <main className="teacher-main approver-main review-detail-page"><header className="review-detail-header"><div><Link className="teacher-back-link" href="/approver/course-reviews">← Course reviews</Link><p className="eyebrow">Submitted Version {review.versionNumber}</p><h1>{review.title}</h1><p>{review.course.teacher.fullName} · Submitted {formatSubmitted(review.submittedAt)}</p></div><span>{formatWaiting(review.submittedAt)} in queue</span></header><div className="review-detail-layout"><section className="review-evidence"><header><h2>Review evidence</h2><p>Confirm each requirement before recording a decision.</p></header><ol>{checklist.map((item, index) => <li key={item.label}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.label}</strong><p>{item.detail || 'Not supplied'}</p></div><b>Ready</b></li>)}</ol></section><aside className="review-decision-panel"><p className="eyebrow">Final decision</p><h2>Approve or return?</h2><p>Approval publishes this Version automatically. A rejection must include a clear correction comment.</p><label>Review comment<textarea rows={6} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Required when rejecting this Version" /></label>{actionError ? <p className="form-help" role="alert">{actionError}</p> : null}<div><button type="button" disabled={saving} onClick={() => void decide('REJECTED')}>Reject Version</button><button type="button" disabled={saving} onClick={() => void decide('APPROVED')}>{saving ? 'Saving…' : 'Approve & publish'}</button></div><small>This decision is recorded in the backend immediately.</small></aside></div></main>;
}
