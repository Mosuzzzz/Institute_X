'use client';

import Link from 'next/link';
import type { TeacherCourseAnalyticsDto, TeacherCourseDto, TeacherPermissionDto } from '../../lib/backend-api';
import { useBackendQuery } from '../../lib/use-backend-query';
import { useAppLanguage } from '../../lib/language';
import ApiState from '../api-state';
import StatusBadge from './status-badge';
import { toTeacherCourse } from './teacher-api';
import styles from './overview.module.css';

function TrafficRow({ courseId, title }: { courseId: string; title: string }) {
  const { data } = useBackendQuery<TeacherCourseAnalyticsDto>(`teacher/courses/${courseId}/analytics`);
  return <div className={styles.trafficRow}><span>{title}</span><div><strong>{data?.accesses ?? '—'}</strong><small>accesses</small></div><div><strong>{data?.enrollments ?? '—'}</strong><small>enrollments</small></div></div>;
}

export default function TeacherOverviewPage() {
  const [language] = useAppLanguage();
  const coursesQuery = useBackendQuery<TeacherCourseDto[]>('courses/mine');
  const permissionQuery = useBackendQuery<TeacherPermissionDto | null>('teacher-permissions/me');
  if (!coursesQuery.data) return <main data-ui="page" className={styles.page}><ApiState loading={coursesQuery.loading} error={coursesQuery.error} /></main>;
  const courses = coursesQuery.data.map((course) => toTeacherCourse(course, language));
  const canCreateCourse = permissionQuery.data?.status === 'APPROVED';
  const draftCount = courses.filter((course) => course.status === 'DRAFT' || course.status === 'REJECTED').length;
  const reviewCount = courses.filter((course) => course.status === 'SUBMITTED').length;
  const publishedCount = courses.filter((course) => course.status === 'PUBLISHED').length;

  return (
    <main data-ui="page" className={styles.page}>
      <h1>Overview</h1>
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5" aria-label="Teacher access"><h2 className="text-lg font-medium">Teacher Access</h2><p className="mt-1 text-sm text-slate-600">Your teacher role has been verified. Course creation requires separate teaching permission.</p><p className="mt-4 text-sm">Teaching permission: <strong>{permissionQuery.loading ? 'Checking…' : permissionQuery.data?.status ?? 'Not requested'}</strong></p>{permissionQuery.data?.status === 'PENDING' ? <p className="mt-2 text-sm text-slate-600">Your request is being reviewed.</p> : null}{permissionQuery.data?.reviewComment ? <p className="mt-2 text-sm text-slate-600">Approver feedback: {permissionQuery.data.reviewComment}</p> : null}{permissionQuery.error ? <p className="mt-2 text-sm text-red-700">{permissionQuery.error}</p> : null}{!canCreateCourse && permissionQuery.data?.status !== 'PENDING' ? <Link className="mt-4 inline-block text-sm font-medium text-blue-700 underline" href="/teacher/permission">{permissionQuery.data?.status === 'REJECTED' || permissionQuery.data?.status === 'REVOKED' ? 'Request Again' : 'Request Teaching Permission'}</Link> : null}</section>
      <nav className={styles.tabs} aria-label="Teacher workspace tabs"><span aria-current="page">Overview</span></nav>
      <div className={styles.toolbar}><p>Manage your courses and track their progress.</p><Link className={styles.newCourse} href={canCreateCourse ? '/teacher/courses/new' : '/teacher/permission'}>{canCreateCourse ? 'New course' : 'Request teaching permission'}</Link></div>
      <section className={styles.metrics} aria-label="Course totals"><article><span>Needs attention</span><strong>{draftCount}</strong><p>Draft or rejected courses</p></article><article><span>Under review</span><strong>{reviewCount}</strong><p>Submitted to an Approver</p></article><article><span>Published</span><strong>{publishedCount}</strong><p>Available to Students</p></article></section>
      <section className={styles.traffic} aria-labelledby="traffic-heading"><div className={styles.sectionHeading}><div><h2 id="traffic-heading">Course traffic</h2><p>Accesses and enrollments across your courses</p></div><Link href="/teacher/courses">View courses</Link></div><div className={styles.trafficHeader}><span>Course</span><span>Accesses</span><span>Enrollments</span></div>{courses.slice(0, 4).map((course) => <TrafficRow courseId={course.id} title={course.title} key={course.id} />)}</section>
      <section className={styles.recent} aria-labelledby="recent-heading"><div className={styles.sectionHeading}><div><h2 id="recent-heading">Recent courses</h2><p>{courses.length} total courses</p></div><Link href="/teacher/courses">View all</Link></div>{courses.length ? courses.slice(0, 4).map((course) => <Link className={styles.course} href={`/teacher/courses/${course.id}`} key={course.id}><div className={styles.courseVersion}>V{course.version}</div><div className={styles.courseDetails}><h3>{course.title}</h3><p>{course.category} · Updated {course.updated}</p></div><StatusBadge status={course.status} /></Link>) : <div className={styles.empty}>No courses created yet.</div>}</section>
    </main>
  );
}
