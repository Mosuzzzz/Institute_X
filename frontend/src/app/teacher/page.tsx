'use client';

import Link from 'next/link';
import type { TeacherCourseDto, TeacherPermissionDto } from '../../lib/backend-api';
import { useBackendQuery } from '../../lib/use-backend-query';
import { useAppLanguage } from '../../lib/language';
import ApiState from '../api-state';
import StatusBadge from './status-badge';
import { toTeacherCourse } from './teacher-api';
import { staffUi } from '../ui-styles';

export default function TeacherOverviewPage() {
  const [language] = useAppLanguage();
  const coursesQuery = useBackendQuery<TeacherCourseDto[]>('courses/mine');
  const permissionQuery = useBackendQuery<TeacherPermissionDto | null>('teacher-permissions/me');
  if (!coursesQuery.data) return <main className={staffUi.page}><ApiState loading={coursesQuery.loading} error={coursesQuery.error} /></main>;
  const courses = coursesQuery.data.map((course) => toTeacherCourse(course, language));
  const permission = permissionQuery.data;
  const draftCount = courses.filter((course) => course.status === 'DRAFT' || course.status === 'REJECTED').length;
  const reviewCount = courses.filter((course) => course.status === 'SUBMITTED').length;
  const publishedCount = courses.filter((course) => course.status === 'PUBLISHED').length;

  return (
    <main className={staffUi.page}>
      <header className={staffUi.heading}><div><p className={staffUi.eyebrow}>Course lifecycle</p><h1>Teacher overview</h1><p>Continue authoring, track reviews and prepare your next Course Version.</p></div><Link className={staffUi.primaryAction} href="/teacher/courses/new">Create course</Link></header>
      <section className={staffUi.permissionStrip} aria-labelledby="permission-summary"><div><span className={staffUi.permissionMark}>{permission?.status === 'APPROVED' ? '✓' : '·'}</span><div><p id="permission-summary">Teaching permission</p><strong>{permissionQuery.loading ? 'Loading' : permission?.status ?? 'Not requested'}</strong></div></div><p>{permission?.status === 'APPROVED' ? 'You can create Courses and submit Versions for approval.' : 'Open the permission page to review or request access.'}</p><Link href="/teacher/permission">View details</Link></section>
      <section className={staffUi.lifecycleBoard} aria-labelledby="lifecycle-heading"><div className={staffUi.sectionHeading}><div><p className={staffUi.eyebrow}>At a glance</p><h2 id="lifecycle-heading">Course lifecycle</h2></div></div><div className={staffUi.lifecycleGrid}><article><p>Needs work</p><strong>{draftCount}</strong><span>Draft or rejected Versions</span></article><article><p>In review</p><strong>{reviewCount}</strong><span>Submitted to Approvers</span></article><article><p>Published</p><strong>{publishedCount}</strong><span>Available to eligible Students</span></article></div></section>
      <section className={staffUi.courseSection} aria-labelledby="recent-courses"><div className={staffUi.sectionHeading}><div><p className={staffUi.eyebrow}>Resume work</p><h2 id="recent-courses">Recent courses</h2></div><Link href="/teacher/courses">View all courses</Link></div>{courses.length ? <div className={staffUi.courseList}>{courses.slice(0, 3).map((course) => <Link key={course.id} href={`/teacher/courses/${course.id}`} className={staffUi.courseRow}><div className={staffUi.courseIndex}>V{course.version}</div><div><h3>{course.title}</h3><p>{course.category} · Updated {course.updated}</p></div><StatusBadge status={course.status} /><span className={staffUi.courseArrow}>→</span></Link>)}</div> : <p className={staffUi.empty}>No courses yet. Create your first course after permission is approved.</p>}</section>
    </main>
  );
}
