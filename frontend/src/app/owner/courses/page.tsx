import { coursePortfolio, popularCourses } from '../owner-data';

export default function OwnerCoursesPage() {
  return (
    <main className="teacher-main owner-main">
      <header className="teacher-page-heading"><div><p className="eyebrow">Portfolio oversight</p><h1>Courses</h1><p>Track publication health and the courses creating the most learning demand.</p></div><span className="owner-live-label">58 versions · Demo data</span></header>
      <section className="owner-portfolio-strip" aria-label="Course lifecycle totals">{coursePortfolio.map((item, index) => <article key={item.state}><span>0{index + 1}</span><div><p>{item.state}</p><strong>{item.count}</strong><small>{item.description}</small></div></article>)}</section>
      <section className="owner-list-section"><div className="teacher-section-heading"><div><p className="eyebrow">Ranked by enrollment</p><h2>Popular courses</h2></div><span>Dashboard API field</span></div><div className="owner-course-table owner-course-table-full"><header><span>Course</span><span>Category</span><span>Enrollments</span><span>Completion</span></header>{popularCourses.map((course, index) => <div key={course.id}><span className="owner-rank">0{index + 1}</span><div><strong>{course.title}</strong><small>{course.id}</small></div><span>{course.category}</span><b>{course.enrollments}</b><div className="owner-table-progress"><span><i style={{ width: `${course.completion}%` }} /></span><small>{course.completion}%</small></div></div>)}</div></section>
      <p className="teacher-demo-note">Popular-course shape matches <code>GET /api/owner/dashboard</code>; lifecycle totals remain demo data until a portfolio endpoint is added.</p>
    </main>
  );
}
