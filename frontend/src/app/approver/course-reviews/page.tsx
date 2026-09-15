'use client';

import Link from 'next/link';
import type { SubmittedVersionDto } from '../../../lib/backend-api';
import { useBackendQuery } from '../../../lib/use-backend-query';
import ApiState from '../../api-state';
import { formatSubmitted, formatWaiting } from '../approver-api';
import { staffUi } from '../../ui-styles';
import BootstrapIcon from '../../bootstrap-icon';
import { useAppLanguage } from '../../../lib/language';
import { useUiTranslation } from "../../../lib/ui-translations";


export default function CourseReviewsPage() {
  const t = useUiTranslation();
  const [language] = useAppLanguage();
  const { data, error, loading } = useBackendQuery<SubmittedVersionDto[]>('course-versions/pending-review');
  if (!data) return <main data-ui="page" className={staffUi.page}><ApiState loading={loading} error={error} /></main>;
  return <main data-ui="page" className={staffUi.page}><header className={staffUi.heading}><div><p className={staffUi.eyebrow}>{t("Publication queue")}</p><h1>{t("Course reviews")}</h1><p>{t("Inspect submitted Versions before approval automatically publishes them.")}</p></div><span className={staffUi.count}>{data.length}{t(" pending")}</span></header><section className={`${staffUi.reviewTable} ui-review-table`} aria-label={t("Submitted Course Versions")}><header><span>{t("Course Version")}</span><span>{t("Teacher")}</span><span>{t("Submitted")}</span><span>{t("Waiting")}</span><span /></header>{data.map((review) => <Link key={review.id} href={`/approver/course-reviews/${review.id}`}><div><strong>{review.title}</strong><span>{review.course.allowedMajors.map(({ major }) => major.code).join(', ') || t('All')}{t(" · Version ")}{review.versionNumber}</span></div><span data-label={t("Teacher")}>{review.course.teacher.fullName}</span><span data-label={t("Submitted")}>{formatSubmitted(review.submittedAt, language)}</span><strong data-label={t("Waiting")}>{formatWaiting(review.submittedAt, language)}</strong><b>{t("Review ")}<BootstrapIcon name="arrow-right" /></b></Link>)}</section>{!data.length ? <p className={staffUi.empty}>{t("No submitted Course Versions are waiting.")}</p> : null}</main>;
}
