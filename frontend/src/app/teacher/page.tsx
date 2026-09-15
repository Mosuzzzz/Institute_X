'use client';

import Link from 'next/link';
import type { TeacherCourseAnalyticsDto, TeacherCourseDto } from '../../lib/backend-api';
import { useBackendQuery } from '../../lib/use-backend-query';
import { useAppLanguage } from '../../lib/language';
import ApiState from '../api-state';
import StatusBadge from './status-badge';
import { toTeacherCourse } from './teacher-api';
import styles from './overview.module.css';
import { useUiTranslation } from "../../lib/ui-translations";


function TrafficRow({ courseId, title }: { courseId: string; title: string }) {
  const t = useUiTranslation();
  const { data } = useBackendQuery<TeacherCourseAnalyticsDto>(`teacher/courses/${courseId}/analytics`);
  return <div className={styles.trafficRow}><span>{title}</span><div><strong>{data?.accesses ?? '—'}</strong><small>{t("accesses")}</small></div><div><strong>{data?.enrollments ?? '—'}</strong><small>{t("enrollments")}</small></div></div>;
}

export default function TeacherOverviewPage() {
  const t = useUiTranslation();
  const [language] = useAppLanguage();
  const coursesQuery = useBackendQuery<TeacherCourseDto[]>('courses/mine');
  if (!coursesQuery.data) return <main data-ui="page" className={styles.page}><ApiState loading={coursesQuery.loading} error={coursesQuery.error} /></main>;
  const courses = coursesQuery.data.map((course) => toTeacherCourse(course, language));
  const draftCount = courses.filter((course) => course.status === 'DRAFT' || course.status === 'REJECTED').length;
  const reviewCount = courses.filter((course) => course.status === 'SUBMITTED').length;
  const publishedCount = courses.filter((course) => course.status === 'PUBLISHED').length;

  return (
    <main data-ui="page" className={styles.page}>
      <h1>{t("Overview")}</h1>
      <div className={styles.toolbar}><p>{t("Manage your courses and track their progress.")}</p><Link className={styles.newCourse} href="/teacher/courses/new">{t("New course")}</Link></div>
      <section className={styles.metrics} aria-label={t("Course totals")}><article><span>{t("Needs attention")}</span><strong>{draftCount}</strong><p>{t("Draft or rejected courses")}</p></article><article><span>{t("Under review")}</span><strong>{reviewCount}</strong><p>{t("Submitted to an Approver")}</p></article><article><span>{t("Published")}</span><strong>{publishedCount}</strong><p>{t("Available to Students")}</p></article></section>
      <section className={styles.traffic} aria-labelledby="traffic-heading"><div className={styles.sectionHeading}><div><h2 id="traffic-heading">{t("Course traffic")}</h2><p>{t("Accesses and enrollments across your courses")}</p></div><Link href="/teacher/courses">{t("View courses")}</Link></div><div className={styles.trafficHeader}><span>{t("Course")}</span><span>{t("Accesses")}</span><span>{t("Enrollments")}</span></div>{courses.slice(0, 4).map((course) => <TrafficRow courseId={course.id} title={course.title} key={course.id} />)}</section>
      <section className={styles.recent} aria-labelledby="recent-heading"><div className={styles.sectionHeading}><div><h2 id="recent-heading">{t("Recent courses")}</h2><p>{courses.length}{t(" total courses")}</p></div><Link href="/teacher/courses">{t("View all")}</Link></div>{courses.length ? courses.slice(0, 4).map((course) => <Link className={styles.course} href={`/teacher/courses/${course.id}`} key={course.id}><div className={styles.courseVersion}>V{course.version}</div><div className={styles.courseDetails}><h3>{course.title}</h3><p>{course.category}{t(" · Updated ")}{course.updated}</p></div><StatusBadge status={course.status} /></Link>) : <div className={styles.empty}>{t("No courses created yet.")}</div>}</section>
    </main>
  );
}
