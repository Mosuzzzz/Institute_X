export default function TeacherPermissionPage() {
  return (
    <main className="teacher-main permission-page">
      <header className="teacher-page-heading"><div><p className="eyebrow">Authorization</p><h1>Teaching permission</h1><p>Course creation is available only after an Approver accepts your request.</p></div></header>
      <section className="permission-timeline">
        <header><div className="permission-mark">✓</div><div><p>Current status</p><h2>Approved</h2><span>Approved on 20 August 2026</span></div></header>
        <div className="permission-details"><div><span>Request message</span><p>I would like to create online Courses for eligible Institute X Students.</p></div><div><span>Approver comment</span><p>Teaching access approved for the current academic year.</p></div></div>
      </section>
      <aside className="permission-guidance"><h2>What this permission allows</h2><ul><li>Create a Course and its first Draft Version</li><li>Manage owned Course content and assessments</li><li>Submit Course Versions for Approver review</li><li>View analytics for owned Courses</li></ul></aside>
      <p className="teacher-demo-note">Demo permission state — replace with `GET /api/teacher-permissions/me` when API integration is enabled.</p>
    </main>
  );
}
