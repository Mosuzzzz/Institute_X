'use client';

import Link from 'next/link';
import BootstrapIcon from '../../../bootstrap-icon';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  backendApi,
  type SignedViewUrlDto,
  type SubmittedVersionDto,
} from '../../../../lib/backend-api';
import { useBackendQuery } from '../../../../lib/use-backend-query';
import { useAppLanguage } from '../../../../lib/language';
import { translateMajor } from '../../../../lib/reference-translations';
import ApiState from '../../../api-state';
import QuestionImage from '../../../question-image';
import { formatSubmitted, formatWaiting } from '../../approver-api';
import { commonUi, staffUi } from '../../../ui-styles';

export default function CourseReviewClient({ versionId }: { versionId: string }) {
  const router = useRouter();
  const [language] = useAppLanguage();
  const { data, error, loading } = useBackendQuery<SubmittedVersionDto[]>('course-versions/pending-review');
  const [activeTab, setActiveTab] = useState<'evidence' | 'content' | 'quizzes'>('evidence');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [previewingAssetId, setPreviewingAssetId] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, SignedViewUrlDto>>({});
  const [previewClock, setPreviewClock] = useState(() => Date.now());

  useEffect(() => {
    const nextExpiry = Math.min(
      ...Object.values(previewUrls)
        .map((preview) => Date.parse(preview.expiresAt))
        .filter((expiresAt) => expiresAt > previewClock),
    );
    if (!Number.isFinite(nextExpiry)) return;

    const timer = window.setTimeout(
      () => setPreviewClock(Date.now()),
      Math.max(0, nextExpiry - previewClock + 50),
    );
    return () => window.clearTimeout(timer);
  }, [previewClock, previewUrls]);

  if (!data) {
    return (
      <main className={staffUi.page}>
        <ApiState loading={loading} error={error} />
      </main>
    );
  }

  const review = data.find((item) => item.id === versionId);
  if (!review) {
    return (
      <main className={staffUi.page}>
        <section className={`${commonUi.empty} border-[#d99da2] bg-[#fae9eb] text-[#8b343b]`}>
          <strong>Version is no longer pending</strong>
          <p>It may already have been reviewed.</p>
          <Link className="font-bold underline" href="/approver/course-reviews">
            Return to queue
          </Link>
        </section>
      </main>
    );
  }

  const preTest = review.quizzes.find((quiz) => quiz.quizType === 'PRE_TEST');
  const postTest = review.quizzes.find((quiz) => quiz.quizType === 'POST_TEST');

  const checklist = [
    {
      label: 'Learning content',
      detail: `${review.contentItems.length} ordered content items`,
      ready: review.contentItems.length > 0,
    },
    {
      label: 'Pre-Test (Mandatory)',
      detail: `${preTest?.questions.length ?? 0} questions configured`,
      ready: (preTest?.questions.length ?? 0) > 0,
    },
    {
      label: 'Post-Test',
      detail: postTest ? `${postTest.questions.length} questions configured` : 'Missing (Required)',
      ready: (postTest?.questions.length ?? 0) > 0,
    },
    {
      label: 'Eligible Majors',
      detail: review.course.allowedMajors.length
        ? review.course.allowedMajors.map(({ major }) => `${major.code} — ${translateMajor(major, language)}`).join(', ')
        : 'Open to all Majors (OPEN mode)',
      ready: true,
    },
  ];

  const decide = async (decision: 'APPROVED' | 'REJECTED') => {
    if (decision === 'REJECTED' && !comment.trim()) {
      setActionError('A rejection comment is required when rejecting a submission.');
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      await backendApi<void>(`course-versions/${versionId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ decision, comment: comment.trim() || undefined }),
      });
      router.replace('/approver/course-reviews');
      router.refresh();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'Unable to record review.');
      setSaving(false);
    }
  };

  const prepareMediaPreview = async (assetId: string) => {
    setPreviewingAssetId(assetId);
    setActionError(null);
    try {
      const signed = await backendApi<SignedViewUrlDto>(`media/${assetId}/review-url`);
      setPreviewUrls((current) => ({ ...current, [assetId]: signed }));
      window.setTimeout(() => setPreviewClock(Date.now()), 0);
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to prepare this media preview.',
      );
    } finally {
      setPreviewingAssetId(null);
    }
  };

  return (
    <main className={staffUi.page}>
      <header className={staffUi.reviewHeader}>
        <div>
          <Link className={staffUi.backLink} href="/approver/course-reviews">
            <BootstrapIcon name="arrow-left" /> Course reviews
          </Link>
          <p className={staffUi.eyebrow}>Submitted Version {review.versionNumber}</p>
          <h1>{review.title}</h1>
          <p>
            {review.course.teacher.fullName} ({review.course.teacher.universityEmail}) · Submitted {formatSubmitted(review.submittedAt)}
          </p>
        </div>
        <span>{formatWaiting(review.submittedAt)} in queue</span>
      </header>

      {/* Tabs navigation */}
      <div className="mb-6 flex gap-3 border-b border-[#d8dde5]">
        <button
          type="button"
          onClick={() => setActiveTab('evidence')}
          className={`cursor-pointer border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'evidence' ? 'border-[#073d78] text-[#073d78]' : 'border-transparent text-[#687486] hover:text-[#202a38]'
          }`}
        >
          Overview & Checklist
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('content')}
          className={`cursor-pointer border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'content' ? 'border-[#073d78] text-[#073d78]' : 'border-transparent text-[#687486] hover:text-[#202a38]'
          }`}
        >
          Course Content ({review.contentItems.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('quizzes')}
          className={`cursor-pointer border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'quizzes' ? 'border-[#073d78] text-[#073d78]' : 'border-transparent text-[#687486] hover:text-[#202a38]'
          }`}
        >
          Assessments & Quizzes ({review.quizzes.length})
        </button>
      </div>

      <div className={staffUi.reviewLayout}>
        <section className={staffUi.reviewEvidence}>
          {activeTab === 'evidence' && (
            <>
              <header>
                <h2>Review evidence</h2>
                <p>Confirm each requirement before recording an approval or rejection decision.</p>
              </header>
              <ol>
                {checklist.map((item, index) => (
                  <li key={item.label}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.detail || 'Not supplied'}</p>
                    </div>
                    <b className={item.ready ? 'text-[#07545b]' : 'text-[#8f1d14]'}>
                      {item.ready ? 'Ready' : 'Needs work'}
                    </b>
                  </li>
                ))}
              </ol>
              {review.description && (
                <div className="mt-8 rounded border border-[#d8dde5] bg-[#f8fafd] p-5">
                  <h3 className="text-xs font-bold tracking-wider text-[#073d78] uppercase">Course Description</h3>
                  <p className="mt-2 text-sm leading-6 text-[#435166]">{review.description}</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'content' && (
            <div>
              <header className="mb-4">
                <h2>Submitted Content Items</h2>
                <p>Review the lessons, texts, and media files prepared for students.</p>
              </header>
              {review.contentItems.length ? (
                <div className="space-y-4">
                  {review.contentItems.map((item, idx) => (
                    <article key={item.id} className="rounded border border-[#d8dde5] bg-white p-5">
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-[#eef1f5] px-2.5 py-1 text-xs font-semibold text-[#435166]">
                          {idx + 1}. {item.contentType}
                        </span>
                        {item.mediaAsset && (
                          <span className={`text-xs font-semibold ${item.mediaAsset.status === 'READY' ? 'text-[#07545b]' : 'text-[#8f1d14]'}`}>
                            Asset: {item.mediaAsset.status}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 text-base font-semibold text-[#202a38]">
                        {item.title ?? `Item ${idx + 1}`}
                      </h3>
                      {item.textBody && (
                        <div className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap rounded bg-[#fafbfc] p-3 text-xs leading-5 text-[#435166]">
                          {item.textBody}
                        </div>
                      )}
                      {item.mediaAsset && (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#eef1f5] pt-3">
                          <p className="text-xs text-[#687486]">
                            File: <strong>{item.mediaAsset.fileName}</strong> ({item.mediaAsset.mimeType})
                          </p>
                          {item.mediaAsset.status === 'READY' ? (
                            previewUrls[item.mediaAsset.id] &&
                            Date.parse(previewUrls[item.mediaAsset.id].expiresAt) > previewClock ? (
                              <a
                                className="inline-flex min-h-9 items-center border border-[#073d78] px-3 text-xs font-semibold text-[#073d78] no-underline hover:bg-[#edf3f8]"
                                href={previewUrls[item.mediaAsset.id].url}
                                rel="noreferrer"
                                target="_blank"
                              >
                                Open preview ↗
                              </a>
                            ) : (
                              <button
                                className="min-h-9 cursor-pointer border border-[#073d78] bg-white px-3 text-xs font-semibold text-[#073d78] hover:bg-[#edf3f8] disabled:cursor-wait disabled:opacity-60"
                                disabled={previewingAssetId === item.mediaAsset.id}
                                onClick={() => void prepareMediaPreview(item.mediaAsset!.id)}
                                type="button"
                              >
                                {previewingAssetId === item.mediaAsset.id
                                  ? 'Preparing…'
                                  : previewUrls[item.mediaAsset.id]
                                    ? 'Renew preview'
                                    : 'Prepare preview'}
                              </button>
                            )
                          ) : null}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#687486]">No learning content items provided.</p>
              )}
            </div>
          )}

          {activeTab === 'quizzes' && (
            <div>
              <header className="mb-4">
                <h2>Assessments & Answer Keys</h2>
                <p>Verify that pre-tests and post-tests have clear questions and designated correct answers.</p>
              </header>
              {review.quizzes.length ? (
                <div className="space-y-6">
                  {review.quizzes.map((quiz) => (
                    <div key={quiz.id} className="rounded border border-[#d8dde5] bg-white p-5">
                      <div className="flex items-center justify-between border-b border-[#eef1f5] pb-3">
                        <h3 className="font-semibold text-[#202a38]">
                          {quiz.quizType === 'PRE_TEST' ? 'Pre-Test' : 'Post-Test'}: {quiz.title}
                        </h3>
                        <span className="text-xs text-[#687486]">
                          {quiz.questions.length} question{quiz.questions.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="mt-4 space-y-4">
                        {quiz.questions.map((question, qIdx) => (
                          <div key={question.id} className="rounded bg-[#f9fafb] p-3 text-sm">
                            <p className="font-medium text-[#202a38]">
                              Q{qIdx + 1}. {question.questionText}
                            </p>
                            {question.imageAsset ? (
                              <QuestionImage
                                assetId={question.imageAsset.id}
                                alt={`Question ${qIdx + 1}: ${question.questionText}`}
                                className="mt-3 max-h-80 max-w-full rounded border border-[#d8dde5] object-contain"
                                fallback={<p className="mt-2 text-xs text-[#8b343b]">Question image unavailable.</p>}
                              />
                            ) : null}
                            <ul className="mt-2 space-y-1 pl-4">
                              {question.options.map((opt) => (
                                <li
                                  key={opt.id}
                                  className={`text-xs ${
                                    opt.isCorrect ? 'font-semibold text-[#07545b]' : 'text-[#687486]'
                                  }`}
                                >
                                  {opt.isCorrect ? '' : '• '} {opt.optionText} {opt.isCorrect ? '(Correct)' : ''}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#687486]">No quizzes found in this version.</p>
              )}
            </div>
          )}
        </section>

        <aside className={staffUi.decisionPanel}>
          <p className={staffUi.eyebrow}>Final decision</p>
          <h2>Approve or return?</h2>
          <p>
            Approval publishes this Version immediately to active catalogs (auto-publish) and supersedes the previous live Version. A rejection must include a clear correction comment for the teacher.
          </p>
          <label>
            Review comment
            <textarea
              rows={6}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Required when rejecting this Version"
            />
          </label>
          {actionError ? (
            <p className={staffUi.help} role="alert">
              {actionError}
            </p>
          ) : null}
          <div>
            <button type="button" disabled={saving} onClick={() => void decide('REJECTED')}>
              Reject Version
            </button>
            <button type="button" disabled={saving} onClick={() => void decide('APPROVED')}>
              {saving ? 'Publishing…' : 'Approve & Publish'}
            </button>
          </div>
          <small>This decision is recorded and published by the backend atomically.</small>
        </aside>
      </div>
    </main>
  );
}
