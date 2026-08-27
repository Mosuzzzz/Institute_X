'use client';

import { useState } from 'react';
import { backendApi, type TeacherPermissionDto } from '../../../lib/backend-api';
import { useBackendQuery } from '../../../lib/use-backend-query';
import ApiState from '../../api-state';
import { formatSubmitted, formatWaiting } from '../approver-api';

export default function TeacherRequestsPage() {
  const { data, error, loading, refresh } = useBackendQuery<TeacherPermissionDto[]>('teacher-permissions/pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  if (!data) return <main className="teacher-main approver-main"><ApiState loading={loading} error={error} /></main>;

  const decide = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    const comment = decision === 'REJECTED' ? window.prompt('Reason for rejection:')?.trim() : undefined;
    if (decision === 'REJECTED' && !comment) return;
    setBusyId(id); setActionError(null);
    try {
      await backendApi<void>(`teacher-permissions/${id}/review`, { method: 'PATCH', body: JSON.stringify({ decision, comment }) });
      await refresh();
    } catch (requestError) { setActionError(requestError instanceof Error ? requestError.message : 'Unable to record decision.'); }
    finally { setBusyId(null); }
  };

  return (
    <main className="teacher-main approver-main">
      <header className="teacher-page-heading"><div><p className="eyebrow">Authorization queue</p><h1>Teacher requests</h1><p>Review requests in submission order and record a reason when access is rejected.</p></div><span className="queue-count">{data.length} pending</span></header>
      {actionError ? <p className="form-help" role="alert">{actionError}</p> : null}
      <section className="permission-request-list" aria-label="Pending Teacher permission requests">{data.map((request, index) => <article key={request.id}><header><span>{String(index + 1).padStart(2, '0')}</span><div><h2>{request.teacher?.fullName}</h2><p>{request.teacher?.universityEmail}</p></div><time>{formatWaiting(request.requestedAt)}</time></header><blockquote>{request.requestMessage ?? 'No request message supplied.'}</blockquote><footer><span>Requested {formatSubmitted(request.requestedAt)}</span><div><button type="button" disabled={busyId === request.id} onClick={() => void decide(request.id, 'REJECTED')}>Reject</button><button type="button" disabled={busyId === request.id} onClick={() => void decide(request.id, 'APPROVED')}>{busyId === request.id ? 'Saving…' : 'Approve'}</button></div></footer></article>)}</section>
      {!data.length ? <p className="api-empty">No pending Teacher permission requests.</p> : null}
    </main>
  );
}
