'use client';

import { useState } from 'react';
import { backendApi, type TeacherPermissionDto } from '../../../lib/backend-api';
import { useBackendQuery } from '../../../lib/use-backend-query';
import ApiState from '../../api-state';

export default function TeacherPermissionPage() {
  const { data, error, loading, refresh } = useBackendQuery<TeacherPermissionDto | null>('teacher-permissions/me');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  if (loading) return <main className="teacher-main permission-page"><ApiState loading error={null} /></main>;
  if (error) return <main className="teacher-main permission-page"><ApiState loading={false} error={error} /></main>;

  const requestPermission = async () => {
    setSubmitting(true); setActionError(null);
    try {
      await backendApi<TeacherPermissionDto>('teacher-permissions', { method: 'POST', body: JSON.stringify({ requestMessage: 'I would like to create online Courses for eligible Institute X Students.' }) });
      await refresh();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'Unable to request permission.');
    } finally { setSubmitting(false); }
  };

  return (
    <main className="teacher-main permission-page">
      <header className="teacher-page-heading"><div><p className="eyebrow">Authorization</p><h1>Teaching permission</h1><p>Course creation is available only after an Approver accepts your request.</p></div>{!data || data.status === 'REJECTED' || data.status === 'REVOKED' ? <button className="teacher-primary-action" type="button" disabled={submitting} onClick={() => void requestPermission()}>{submitting ? 'Sending…' : 'Request permission'}</button> : null}</header>
      <section className="permission-timeline"><header><div className="permission-mark">{data?.status === 'APPROVED' ? '✓' : '·'}</div><div><p>Current status</p><h2>{data?.status ?? 'Not requested'}</h2><span>{data ? `Requested ${new Date(data.requestedAt).toLocaleDateString('en-GB')}` : 'No permission request found'}</span></div></header><div className="permission-details"><div><span>Request message</span><p>{data?.requestMessage ?? 'Submit a request to begin the approval process.'}</p></div><div><span>Approver comment</span><p>{data?.reviewComment ?? 'No review comment yet.'}</p></div></div></section>
      {actionError ? <p className="form-help" role="alert">{actionError}</p> : null}
      <aside className="permission-guidance"><h2>What this permission allows</h2><ul><li>Create a Course and its first Draft Version</li><li>Manage owned Course content and assessments</li><li>Submit Course Versions for Approver review</li><li>View analytics for owned Courses</li></ul></aside>
      <p className="teacher-demo-note">Live data from the Teacher permission API.</p>
    </main>
  );
}
