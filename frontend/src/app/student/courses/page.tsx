import CourseCard from '../course-card';
import { courses } from '../course-data';

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  const { category, q } = await searchParams;
  const query = q?.trim().toLowerCase();
  const visibleCourses = courses.filter((course) =>
    (!category || course.category === category) &&
    (!query || `${course.title} ${course.instructor} ${course.category}`.toLowerCase().includes(query)),
  );
  const title = query ? `Results for “${q}”` : category ?? 'All courses';

  return (
    <main className="student-main catalog-page">
      <header className="catalog-heading">
        <p className="eyebrow">Course catalog</p>
        <h1>{title}</h1>
        <p>{visibleCourses.length} eligible {visibleCourses.length === 1 ? 'course' : 'courses'}</p>
      </header>
      {visibleCourses.length > 0 ? (
        <div className="course-grid catalog-grid">
          {visibleCourses.map((course) => <CourseCard key={course.id} course={course} />)}
        </div>
      ) : (
        <section className="catalog-empty">
          <h2>No matching courses</h2>
          <p>Try a different search term or choose another category.</p>
        </section>
      )}
    </main>
  );
}
