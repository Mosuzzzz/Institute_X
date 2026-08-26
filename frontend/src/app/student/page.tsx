import Link from 'next/link';
import CourseCard from './course-card';
import { courses, learningCourses } from './course-data';

export default function StudentHomePage() {
  return (
    <main className="student-main">
      <section className="continue-section" aria-labelledby="continue-heading">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Your classroom</p>
            <h1 id="continue-heading">Continue learning</h1>
          </div>
          <Link href="/student/learning">View my learning</Link>
        </div>
        <div className="continue-grid">
          {learningCourses.map((course) => <CourseCard key={course.id} course={course} />)}
        </div>
      </section>

      <section className="recommend-section" aria-labelledby="next-heading">
        <div className="section-title-stack">
          <p className="eyebrow">Eligible for your programme</p>
          <h2 id="next-heading">What to learn next</h2>
          <p>Courses</p>
        </div>
        <div className="course-grid">
          {courses.slice(0, 5).map((course) => <CourseCard key={course.id} course={course} />)}
        </div>
      </section>
      <p className="demo-note">Demo catalog — course content will be replaced by data from the Institute X API.</p>
    </main>
  );
}
