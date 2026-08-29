'use client';

import type { OwnerDashboardDto } from '../../../lib/backend-api';
import { useBackendQuery } from '../../../lib/use-backend-query';
import ApiState from '../../api-state';
import { ownerUi, staffUi } from '../../ui-styles';

export default function OwnerCoursesPage() {
  const { data, error, loading } = useBackendQuery<OwnerDashboardDto>('owner/dashboard');
  if (!data) return <main className={staffUi.page}><ApiState loading={loading} error={error} /></main>;

  return (
    <main className={staffUi.page}>
      <header className={staffUi.heading}><div><p className={staffUi.eyebrow}>Portfolio oversight</p><h1>Courses</h1><p>Track the courses creating the most learning demand.</p></div><span className={ownerUi.liveLabel}>{data.overview.courses} courses</span></header>
      <section className={ownerUi.listSection}><div className={staffUi.sectionHeading}><div><p className={staffUi.eyebrow}>Ranked by enrollment</p><h2>Popular courses</h2></div><span>Owner dashboard API</span></div>{data.popularCourses.length ? <div className={ownerUi.courseTable}><header><span>Course</span><span>Source</span><span>Enrollments</span><span>Rank</span></header>{data.popularCourses.map((course, index) => <div key={course.courseId}><span className={ownerUi.rank}>{String(index + 1).padStart(2, '0')}</span><div><strong>{course.title}</strong><small>{course.courseId}</small></div><span>Institute X</span><b>{course.enrollments}</b><div><small>#{index + 1}</small></div></div>)}</div> : <p className={staffUi.empty}>No course enrollments recorded yet.</p>}</section>
    </main>
  );
}
