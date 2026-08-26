import { permissionRequests } from '../approver-data';

export default function TeacherRequestsPage() {
  return (
    <main className="teacher-main approver-main">
      <header className="teacher-page-heading"><div><p className="eyebrow">Authorization queue</p><h1>Teacher requests</h1><p>Review requests in submission order and record a reason when access is rejected.</p></div><span className="queue-count">{permissionRequests.length} pending</span></header>
      <section className="permission-request-list" aria-label="Pending Teacher permission requests">
        {permissionRequests.map((request, index) => (
          <article key={request.id}><header><span>{String(index + 1).padStart(2, '0')}</span><div><h2>{request.teacher}</h2><p>{request.email}</p></div><time>{request.waiting}</time></header><blockquote>{request.message}</blockquote><footer><span>Requested {request.requested}</span><div><button type="button">Reject</button><button type="button">Approve</button></div></footer></article>
        ))}
      </section>
      <p className="teacher-demo-note">Decision buttons are UI-only in this demo and do not mutate backend permission records.</p>
    </main>
  );
}
