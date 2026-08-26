'use client';

import Link from 'next/link';
import type { TeacherCourseDetailDto } from '../../../../lib/backend-api';
import { useBackendQuery } from '../../../../lib/use-backend-query';
import ApiState from '../../../api-state';
import StatusBadge from '../../status-badge';
import { useAppLanguage } from '../../../../lib/language';
import { translateCategory, translateMajor } from '../../../../lib/reference-translations';

export default function CourseDetailClient({ courseId }: { courseId: string }) {
  const [language] = useAppLanguage();
  const { data, error, loading } = useBackendQuery<TeacherCourseDetailDto>(`courses/${courseId}`);
  if (!data) return <main className="teacher-main course-authoring-page"><ApiState loading={loading} error={error} /></main>;
  const version = data.versions[0];
  const status = version?.status === 'SUPERSEDED' ? 'PUBLISHED' : version?.status ?? 'DRAFT';
  const checks = Object.entries(data.checks);
  return <main className="teacher-main course-authoring-page"><header className="course-authoring-header"><div><Link className="teacher-back-link" href="/teacher/courses">← My courses</Link><p>Version {version?.versionNumber ?? 1}</p><h1>{version?.title ?? 'Untitled Course'}</h1><div><StatusBadge status={status} /><span>{data.readiness}% ready</span></div></div></header><div className="authoring-layout"><nav aria-label="Course readiness">{checks.map(([key, ready], index) => <a key={key} className={ready ? 'is-active' : ''} href={`#${key}`}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{key.replace(/([A-Z])/g, ' $1')}</strong><small>{ready ? 'Ready' : 'Needs work'}</small></div></a>)}</nav><section className="authoring-canvas"><header><p className="eyebrow">Backend readiness</p><h2>Course structure</h2><p>{version?.description ?? 'Add a description to complete Course details.'}</p></header><div className="authoring-summary"><div><span>Eligible Majors</span><strong>{data.allowedMajors.map(({ major }) => translateMajor(major, language)).join(', ') || 'None'}</strong></div><div><span>Categories</span><strong>{data.categories.map(({ category }) => translateCategory(category, language)).join(', ') || 'None'}</strong></div><div><span>Content items</span><strong>{version?.contentItems.length ?? 0}</strong></div><div><span>Assessments</span><strong>{version?.quizzes.length ?? 0}</strong></div></div><section className="content-outline"><div><h3>Learning content</h3><span>{data.readiness}% readiness</span></div>{version?.contentItems.length ? <ol>{version.contentItems.map((item, index) => <li key={item.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.title ?? item.contentType}</strong><small>{item.contentType}</small></div></li>)}</ol> : <p className="api-empty">No content items yet.</p>}</section></section></div></main>;
}
