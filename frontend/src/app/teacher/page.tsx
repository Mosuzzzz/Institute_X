import Link from 'next/link';
import StatusBadge from './status-badge';
import { teacherCourses } from './teacher-data';

export default function TeacherOverviewPage() {
  const draftCount = teacherCourses.filter((course) => course.status === 'DRAFT' || course.status === 'REJECTED').length;
  const reviewCount = teacherCourses.filter((course) => course.status === 'SUBMITTED').length;
  const publishedCount = teacherCourses.filter((course) => course.status === 'PUBLISHED').length;

  return (
    <main className="teacher-main">
      <header className="teacher-page-heading">
        <div>
          <p className="eyebrow">Course lifecycle</p>
          <h1>Teacher overview</h1>
          <p>Continue authoring, track reviews and prepare your next Course Version.</p>
        </div>
        <Link className="teacher-primary-action" href="/teacher/courses/new">Create course</Link>
      </header>

      <section className="teacher-permission-strip" aria-labelledby="permission-summary">
        <div><span className="permission-mark">✓</span><div><p id="permission-summary">Teaching permission</p><strong>Approved</strong></div></div>
        <p>You can create Courses and submit Versions for approval.</p>
        <Link href="/teacher/permission">View details</Link>
      </section>

      <section className="lifecycle-board" aria-labelledby="lifecycle-heading">
        <div className="teacher-section-heading"><div><p className="eyebrow">At a glance</p><h2 id="lifecycle-heading">Course lifecycle</h2></div><span>Demo data</span></div>
        <div className="lifecycle-grid">
          <article><p>Needs work</p><strong>{draftCount}</strong><span>Draft or rejected Versions</span></article>
          <article><p>In review</p><strong>{reviewCount}</strong><span>Submitted to Approvers</span></article>
          <article><p>Published</p><strong>{publishedCount}</strong><span>Available to eligible Students</span></article>
        </div>
      </section>

      <section className="teacher-course-section" aria-labelledby="recent-courses">
        <div className="teacher-section-heading"><div><p className="eyebrow">Resume work</p><h2 id="recent-courses">Recent courses</h2></div><Link href="/teacher/courses">View all courses</Link></div>
        <div className="teacher-course-list">
          {teacherCourses.slice(0, 3).map((course) => (
            <Link key={course.id} href={`/teacher/courses/${course.id}`} className="teacher-course-row">
              <div className="course-row-index">V{course.version}</div>
              <div><h3>{course.title}</h3><p>{course.category} · Updated {course.updated}</p></div>
              <StatusBadge status={course.status} />
              <span className="course-row-arrow">→</span>
            </Link>
          ))}
        </div>
      </section>
      <p className="teacher-demo-note">Demo workspace — replace sample records with `GET /api/courses/mine` after frontend API integration.</p>
    </main>
  );
}
