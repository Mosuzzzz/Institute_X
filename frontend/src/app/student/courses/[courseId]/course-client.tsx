'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { backendApi, type CourseEntryDto, type EligibleCourseDto, type PublishedCourseContentDto } from '../../../../lib/backend-api';
import ApiState from '../../../api-state';
import { useAppLanguage } from '../../../../lib/language';
import { translateCategory } from '../../../../lib/reference-translations';

export default function CourseClient({ courseId }: { courseId: string }) {
  const [language] = useAppLanguage();
  const [course, setCourse] = useState<EligibleCourseDto | null>(null);
  const [entry, setEntry] = useState<CourseEntryDto | null>(null);
  const [content, setContent] = useState<PublishedCourseContentDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const catalog = await backendApi<EligibleCourseDto[]>('courses');
        const selected = catalog.find((item) => item.courseId === courseId);
        if (!selected) throw new Error('This Course is not available for your Major.');
        const entered = await backendApi<CourseEntryDto>(`courses/${courseId}/enter`, { method: 'POST' });
        let publishedContent: PublishedCourseContentDto | null = null;
        if (entered.contentUnlocked) publishedContent = await backendApi<PublishedCourseContentDto>(`courses/${courseId}/content`);
        if (!cancelled) { setCourse(selected); setEntry(entered); setContent(publishedContent); }
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to enter this Course.');
      } finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [courseId]);

  if (!course || !entry) return <main className="student-main"><ApiState loading={loading} error={error} /></main>;
  const category = course.categories[0] ? translateCategory(course.categories[0], language) : 'General';
  return <main className="lesson-page"><section className="lesson-stage"><div className="lesson-slide"><p>Institute X · {category}</p><h1>Build knowledge<br />through practice.</h1><div className="lesson-diagram" aria-hidden="true"><span>Concept</span><span>Practice</span><span>Reflect</span></div><div className="lesson-brand"><i />{course.title}</div></div><div className="lesson-details"><p className="eyebrow">Course overview</p><h2>{course.title}</h2><p>{course.description ?? 'Continue through the published learning content and assessments.'}</p><dl><div><dt>Enrollment</dt><dd>Active</dd></div><div><dt>Content</dt><dd>{entry.contentUnlocked ? 'Unlocked' : 'Pre-Test required'}</dd></div></dl>{entry.contentUnlocked && entry.postTestId ? <Link className="assessment-link" href={`/student/assessments/post-test/${entry.postTestId}`}>Take Post-Test →</Link> : null}</div></section><aside className="course-outline" aria-label="Course content"><header><Link href="/student/learning">← My learning</Link><h2>Course content</h2></header>{content ? <ol>{content.contentItems.map((item, index) => <li key={item.id}><button type="button"><span>Item {index + 1}</span><strong>{item.title ?? item.contentType}</strong><small>{item.contentType}{item.media ? ` · ${item.media.fileName}` : ''}</small></button></li>)}</ol> : <section className="api-state"><strong>Complete the Pre-Test first</strong><p>The Pre-Test unlocks this Course&apos;s learning content.</p>{entry.preTestId ? <Link href={`/student/assessments/pre-test/${entry.preTestId}`}>Start Pre-Test →</Link> : <small>This Course does not have a Pre-Test configured.</small>}</section>}</aside></main>;
}
