'use client';

import Link from 'next/link';
import type { TeacherCourseDto } from '../../../lib/backend-api';
import { useBackendQuery } from '../../../lib/use-backend-query';
import ApiState from '../../api-state';
import StatusBadge from '../status-badge';
import { toTeacherCourse } from '../teacher-api';
import { useAppLanguage } from '../../../lib/language';

export default function TeacherCoursesPage() {
  const [language] = useAppLanguage();
  const { data, error, loading } = useBackendQuery<TeacherCourseDto[]>('courses/mine');
  if (!data) return <main className="teacher-main"><ApiState loading={loading} error={error} /></main>;
  const courses = data.map((course) => toTeacherCourse(course, language));

  return (
    <main className="teacher-main">
      <header className="teacher-page-heading"><div><p className="eyebrow">Authoring workspace</p><h1>My courses</h1><p>Open a Course to edit its active Version or inspect its publication state.</p></div><Link className="teacher-primary-action" href="/teacher/courses/new">Create course</Link></header>
      <section className="teacher-course-table" aria-label="Courses"><header><span>Course</span><span>Version</span><span>Status</span><span>Readiness</span><span>Updated</span><span /></header>{courses.map((course) => <Link key={course.id} href={`/teacher/courses/${course.id}`}><div><strong>{course.title}</strong><span>{course.category}</span></div><span>Version {course.version}</span><StatusBadge status={course.status} /><div className="authoring-progress"><span><i style={{ width: `${course.completion}%` }} /></span><small>{course.completion}%</small></div><span>{course.updated}</span><b>→</b></Link>)}</section>
      {!courses.length ? <p className="api-empty">No owned courses were returned by the backend.</p> : null}
      <p className="teacher-demo-note">Live data from <code>GET /api/courses/mine</code>. Readiness is estimated until the backend exposes authoring completeness.</p>
    </main>
  );
}
