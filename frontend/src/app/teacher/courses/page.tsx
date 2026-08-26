import Link from 'next/link';
import StatusBadge from '../status-badge';
import { teacherCourses } from '../teacher-data';

export default function TeacherCoursesPage() {
  return (
    <main className="teacher-main">
      <header className="teacher-page-heading">
        <div><p className="eyebrow">Authoring workspace</p><h1>My courses</h1><p>Open a Course to edit its active Version or inspect its publication state.</p></div>
        <Link className="teacher-primary-action" href="/teacher/courses/new">Create course</Link>
      </header>
      <div className="teacher-filterbar">
        <label><span className="visually-hidden">Search your courses</span><input type="search" placeholder="Search your courses" /></label>
        <div aria-label="Course status filters"><button className="is-active" type="button">All</button><button type="button">Draft</button><button type="button">In review</button><button type="button">Published</button></div>
      </div>
      <section className="teacher-course-table" aria-label="Courses">
        <header><span>Course</span><span>Version</span><span>Status</span><span>Progress</span><span>Updated</span><span /></header>
        {teacherCourses.map((course) => (
          <Link key={course.id} href={`/teacher/courses/${course.id}`}>
            <div><strong>{course.title}</strong><span>{course.category}</span></div>
            <span>Version {course.version}</span>
            <StatusBadge status={course.status} />
            <div className="authoring-progress"><span><i style={{ width: `${course.completion}%` }} /></span><small>{course.completion}%</small></div>
            <span>{course.updated}</span>
            <b>→</b>
          </Link>
        ))}
      </section>
      <p className="teacher-demo-note">Demo data shown until the workspace is connected to the authenticated Teacher API.</p>
    </main>
  );
}
