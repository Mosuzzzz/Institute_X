'use client';

import type { OwnerDashboardDto } from '../../../lib/backend-api';
import { useBackendQuery } from '../../../lib/use-backend-query';
import ApiState from '../../api-state';

export default function OwnerCoursesPage() {
  const { data, error, loading } = useBackendQuery<OwnerDashboardDto>('owner/dashboard');
  if (!data) return <main className="teacher-main owner-main"><ApiState loading={loading} error={error} /></main>;

  return (
    <main className="teacher-main owner-main">
      <header className="teacher-page-heading"><div><p className="eyebrow">Portfolio oversight</p><h1>Courses</h1><p>Track the courses creating the most learning demand.</p></div><span className="owner-live-label">{data.overview.courses} courses · Live data</span></header>
      <section className="owner-list-section"><div className="teacher-section-heading"><div><p className="eyebrow">Ranked by enrollment</p><h2>Popular courses</h2></div><span>Owner dashboard API</span></div>{data.popularCourses.length ? <div className="owner-course-table owner-course-table-full"><header><span>Course</span><span>Source</span><span>Enrollments</span><span>Rank</span></header>{data.popularCourses.map((course, index) => <div key={course.courseId}><span className="owner-rank">{String(index + 1).padStart(2, '0')}</span><div><strong>{course.title}</strong><small>{course.courseId}</small></div><span>Institute X</span><b>{course.enrollments}</b><div className="owner-table-progress"><small>#{index + 1}</small></div></div>)}</div> : <p className="api-empty">No course enrollments recorded yet.</p>}</section>
      <p className="teacher-demo-note">Live data from <code>GET /api/owner/dashboard</code>. Course lifecycle totals need a future portfolio endpoint.</p>
    </main>
  );
}
