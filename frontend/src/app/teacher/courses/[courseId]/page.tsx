import Link from 'next/link';
import { notFound } from 'next/navigation';
import StatusBadge from '../../status-badge';
import { authoringSteps, teacherCourses } from '../../teacher-data';

export default async function TeacherCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const course = teacherCourses.find((item) => item.id === courseId);
  if (!course) notFound();

  return (
    <main className="teacher-main course-authoring-page">
      <header className="course-authoring-header">
        <div><Link className="teacher-back-link" href="/teacher/courses">← My courses</Link><p>Version {course.version}</p><h1>{course.title}</h1><div><StatusBadge status={course.status} /><span>Updated {course.updated}</span></div></div>
        <div><button type="button">Preview</button><button type="button" disabled={course.status !== 'DRAFT'}>Submit for review</button></div>
      </header>
      <div className="authoring-layout">
        <nav aria-label="Course authoring steps">
          {authoringSteps.map((step, index) => (
            <a key={step.key} className={index === 0 ? 'is-active' : ''} href={`#${step.key}`}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{step.label}</strong><small>{step.description}</small></div></a>
          ))}
        </nav>
        <section className="authoring-canvas" id="details">
          <header><p className="eyebrow">Step 01</p><h2>Course details</h2><p>Manage the metadata Students see before entering the Course.</p></header>
          <div className="authoring-summary"><div><span>Title</span><strong>{course.title}</strong></div><div><span>Category</span><strong>{course.category}</strong></div><div><span>Eligible Majors</span><strong>CS, IT</strong></div><div><span>Draft readiness</span><strong>{course.completion}%</strong></div></div>
          <article className={`authoring-callout status-${course.status.toLowerCase()}`}><div><strong>{course.status === 'REJECTED' ? 'Approver feedback' : 'Next action'}</strong><p>{course.note}</p></div><button type="button">Edit details</button></article>
          <section className="content-outline"><div><h3>Content outline</h3><button type="button">Add content</button></div><ol><li><span>01</span><div><strong>Welcome and learning outcomes</strong><small>Text · 4 min</small></div><button type="button">Edit</button></li><li><span>02</span><div><strong>Core concepts</strong><small>Video · 18 min</small></div><button type="button">Edit</button></li><li><span>03</span><div><strong>Guided practice</strong><small>Document · 12 min</small></div><button type="button">Edit</button></li></ol></section>
        </section>
      </div>
      <p className="teacher-demo-note">Authoring controls are UI-only in this demo and do not mutate backend data.</p>
    </main>
  );
}
