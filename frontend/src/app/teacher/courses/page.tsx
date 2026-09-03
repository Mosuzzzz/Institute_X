'use client';

import Link from 'next/link';
import type { TeacherCourseDto, TeacherPermissionDto } from '../../../lib/backend-api';
import { useBackendQuery } from '../../../lib/use-backend-query';
import ApiState from '../../api-state';
import StatusBadge from '../status-badge';
import { toTeacherCourse } from '../teacher-api';
import { useAppLanguage } from '../../../lib/language';
import { staffUi } from '../../ui-styles';

export default function TeacherCoursesPage() {
  const [language] = useAppLanguage();
  const { data, error, loading } = useBackendQuery<TeacherCourseDto[]>('courses/mine');
  const permission = useBackendQuery<TeacherPermissionDto | null>('teacher-permissions/me');
  if (!data) return <main className={staffUi.page}><ApiState loading={loading} error={error} /></main>;
  const courses = data.map((course) => toTeacherCourse(course, language));
  const canCreateCourse = permission.data?.status === 'APPROVED';

  return (
    <main className={staffUi.page}>
      <header className={staffUi.heading}><div><p className={staffUi.eyebrow}>Authoring workspace</p><h1>My courses</h1><p>Open a Course to edit its active Version or inspect its publication state.</p></div><Link className={staffUi.primaryAction} href={canCreateCourse ? "/teacher/courses/new" : "/teacher/permission"}>{canCreateCourse ? 'Create course' : 'Request teaching permission'}</Link></header>
      <section className={staffUi.courseTable} aria-label="Courses"><header><span>Course</span><span>Version</span><span>Status</span><span>Readiness</span><span>Updated</span><span /></header>{courses.map((course) => <Link key={course.id} href={`/teacher/courses/${course.id}`}><div><strong>{course.title}</strong><span>{course.category}</span></div><span>Version {course.version}</span><StatusBadge status={course.status} /><div className={staffUi.progress}><span><i style={{ width: `${course.completion}%` }} /></span><small>{course.completion}%</small></div><span>{course.updated}</span><b>→</b></Link>)}</section>
      {!courses.length ? <p className={staffUi.empty}>No owned courses were returned by the backend.</p> : null}
    </main>
  );
}
