import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { StudentCourse } from './course-data';

export default function CourseCard({ course }: { course: StudentCourse }) {
  return (
    <article className="course-card">
      <Link className="course-art" href={`/student/courses/${course.id}`} style={{ '--course-accent': course.accent } as CSSProperties}>
        <span>{course.mark}</span>
        <i aria-hidden="true" />
      </Link>
      <div className="course-copy">
        <h3><Link href={`/student/courses/${course.id}`}>{course.title}</Link></h3>
        <p>{course.instructor}</p>
      </div>
      {course.progress === undefined ? (
        <div className="course-tags" aria-label="Course access">
          <span className="access-tag">{course.availability}</span>
          <span className="category-tag">{course.category}</span>
        </div>
      ) : (
        <div className="course-progress" aria-label={`${course.progress}% complete`}>
          <div><span style={{ width: `${course.progress}%` }} /></div>
          <p>{course.progress}% complete</p>
        </div>
      )}
    </article>
  );
}
