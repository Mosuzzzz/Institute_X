import CourseCard from '../course-card';
import { learningCourses } from '../course-data';

export default function MyLearningPage() {
  return (
    <main className="student-main learning-page">
      <header className="catalog-heading">
        <p className="eyebrow">Your enrolled courses</p>
        <h1>My learning</h1>
      </header>
      <div className="learning-grid">
        {learningCourses.map((course) => <CourseCard key={course.id} course={course} />)}
      </div>
    </main>
  );
}
