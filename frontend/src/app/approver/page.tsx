'use client';

import Link from 'next/link';
import type { SubmittedVersionDto, TeacherPermissionDto } from '../../lib/backend-api';
import { useBackendQuery } from '../../lib/use-backend-query';
import ApiState from '../api-state';
import { formatWaiting } from './approver-api';

export default function ApproverOverviewPage() {
  const permissions = useBackendQuery<TeacherPermissionDto[]>('teacher-permissions/pending');
  const versions = useBackendQuery<SubmittedVersionDto[]>('course-versions/pending-review');
  if (!permissions.data || !versions.data) return <main className="teacher-main approver-main"><ApiState loading={permissions.loading || versions.loading} error={permissions.error ?? versions.error} /></main>;
  const nextPermission = permissions.data[0];
  const nextVersion = versions.data[0];

  return (
    <main className="teacher-main approver-main">
      <header className="teacher-page-heading"><div><p className="eyebrow">Decision queues</p><h1>Review overview</h1><p>Work oldest-first, inspect the evidence and record a clear decision for every request.</p></div><span className="approver-date">Live backend data</span></header>
      <section className="approval-queue-summary" aria-label="Pending review totals"><Link href="/approver/teacher-requests"><span>01</span><div><p>Teacher permissions</p><strong>{permissions.data.length} pending</strong><small>Oldest waiting {formatWaiting(nextPermission?.requestedAt ?? null)}</small></div><b>→</b></Link><Link href="/approver/course-reviews"><span>02</span><div><p>Course Versions</p><strong>{versions.data.length} pending</strong><small>Oldest waiting {formatWaiting(nextVersion?.submittedAt ?? null)}</small></div><b>→</b></Link></section>
      <section className="approval-worklist"><div className="teacher-section-heading"><div><p className="eyebrow">Next decisions</p><h2>Oldest items first</h2></div><span>Live API</span></div><div className="approval-mixed-list">{nextPermission ? <Link href="/approver/teacher-requests"><span className="approval-type">Permission</span><div><strong>{nextPermission.teacher?.fullName}</strong><small>{nextPermission.teacher?.universityEmail}</small></div><time>{formatWaiting(nextPermission.requestedAt)}</time><b>Review →</b></Link> : null}{nextVersion ? <Link href={`/approver/course-reviews/${nextVersion.id}`}><span className="approval-type course">Course V{nextVersion.versionNumber}</span><div><strong>{nextVersion.title}</strong><small>{nextVersion.course.teacher.fullName}</small></div><time>{formatWaiting(nextVersion.submittedAt)}</time><b>Review →</b></Link> : null}{!nextPermission && !nextVersion ? <p className="api-empty">All review queues are clear.</p> : null}</div></section>
      <p className="teacher-demo-note">Live data from the authenticated Approver APIs.</p>
    </main>
  );
}
