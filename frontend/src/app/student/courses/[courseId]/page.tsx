import Link from 'next/link';
import { notFound } from 'next/navigation';
import { courseSections, courses } from '../../course-data';

export default async function CourseLearningPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const course = courses.find((item) => item.id === courseId);
  if (!course) notFound();

  return (
    <main className="lesson-page">
      <section className="lesson-stage">
        <div className="lesson-slide">
          <p>Institute X · {course.category}</p>
          <h1>Build knowledge<br />through practice.</h1>
          <div className="lesson-diagram" aria-hidden="true">
            <span>Concept</span><span>Practice</span><span>Reflect</span>
          </div>
          <div className="lesson-brand"><i />{course.title}</div>
        </div>
        <div className="lesson-details">
          <p className="eyebrow">Course overview</p>
          <h2>{course.title}</h2>
          <p>Continue through the published lessons, complete the required checks, and track your progress from My learning.</p>
          <dl>
            <div><dt>Instructor</dt><dd>{course.instructor}</dd></div>
            <div><dt>Language</dt><dd>English / Thai</dd></div>
          </dl>
        </div>
      </section>
      <aside className="course-outline" aria-label="Course content">
        <header>
          <Link href="/student/learning">← My learning</Link>
          <h2>Course content</h2>
        </header>
        <ol>
          {courseSections.map((section, index) => (
            <li key={section.title}>
              <button type="button">
                <span>Section {index + 1}</span>
                <strong>{section.title}</strong>
                <small>{section.completed} / {section.lessons} · {section.duration}</small>
              </button>
            </li>
          ))}
        </ol>
      </aside>
    </main>
  );
}
