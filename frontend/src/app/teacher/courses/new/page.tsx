import Link from 'next/link';

export default function NewCoursePage() {
  return (
    <main className="teacher-main teacher-form-page">
      <header className="teacher-page-heading compact">
        <div><Link className="teacher-back-link" href="/teacher/courses">← My courses</Link><p className="eyebrow">New Draft</p><h1>Create a course</h1><p>Set the discovery and eligibility information for Version 1.</p></div>
      </header>
      <form className="teacher-form" action="/teacher/courses">
        <section>
          <header><span>01</span><div><h2>Course information</h2><p>Student-facing title and summary</p></div></header>
          <label>Course title <input name="title" required maxLength={255} placeholder="e.g. Network Fundamentals" /></label>
          <label>Description <textarea name="description" rows={5} maxLength={10000} placeholder="What will Students learn in this Course?" /></label>
        </section>
        <section>
          <header><span>02</span><div><h2>Discovery</h2><p>Where the Course appears in the catalog</p></div></header>
          <fieldset><legend>Categories</legend><div className="teacher-choice-grid"><label><input type="checkbox" name="category" value="it-software" /> IT & Software</label><label><input type="checkbox" name="category" value="design" /> Design</label><label><input type="checkbox" name="category" value="business" /> Business</label><label><input type="checkbox" name="category" value="personal-development" /> Personal Development</label></div></fieldset>
        </section>
        <section>
          <header><span>03</span><div><h2>Student eligibility</h2><p>Choose one or more eligible Majors</p></div></header>
          <fieldset><legend>Eligible Majors</legend><div className="teacher-choice-grid"><label><input type="checkbox" name="major" value="CS" /> Computer Science (CS)</label><label><input type="checkbox" name="major" value="IT" /> Information Technology (IT)</label><label><input type="checkbox" name="major" value="SE" /> Software Engineering (SE)</label></div></fieldset>
          <p className="form-help">The backend requires Major UUIDs. This demo form will be connected after a Majors lookup endpoint is available.</p>
        </section>
        <footer><Link href="/teacher/courses">Cancel</Link><button type="submit" disabled title="Majors lookup API is required">Create Draft</button></footer>
      </form>
    </main>
  );
}
