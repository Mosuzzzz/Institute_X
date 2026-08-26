'use client';

import type { OwnerUserDto } from '../../../lib/backend-api';
import { useBackendQuery } from '../../../lib/use-backend-query';
import ApiState from '../../api-state';
import { useAppLanguage } from '../../../lib/language';
import { translateMajor } from '../../../lib/reference-translations';

const roles: OwnerUserDto['role'][] = ['STUDENT', 'TEACHER', 'APPROVER', 'OWNER'];

export default function OwnerUsersPage() {
  const [language] = useAppLanguage();
  const { data, error, loading } = useBackendQuery<OwnerUserDto[]>('owner/users');
  if (!data) return <main className="teacher-main owner-main"><ApiState loading={loading} error={error} /></main>;
  const total = data.length;

  return (
    <main className="teacher-main owner-main">
      <header className="teacher-page-heading"><div><p className="eyebrow">Account oversight</p><h1>Users</h1><p>Read-only visibility into application roles and account status.</p></div><span className="owner-live-label"><i />{total.toLocaleString()} live accounts</span></header>
      <section className="owner-role-grid" aria-label="User role distribution">
        {roles.map((role, index) => { const count = data.filter((user) => user.role === role).length; const share = total === 0 ? 0 : Math.round((count / total) * 100); return <article key={role}><span>0{index + 1}</span><div><p>{role}</p><strong>{count.toLocaleString()}</strong><small>Application accounts</small></div><b>{share}%</b></article>; })}
      </section>
      <section className="owner-list-section"><div className="teacher-section-heading"><div><p className="eyebrow">Directory</p><h2>Application accounts</h2></div><span>Read only</span></div><div className="owner-user-table"><header><span>User</span><span>Role</span><span>Affiliation</span><span>Status</span><span>Updated</span></header>{data.map((user) => <div key={user.id}><div><strong>{user.fullName}</strong><small>{user.username} · {user.universityEmail}</small></div><span>{user.role}</span><span>{user.major ? `${user.major.code} · ${translateMajor(user.major, language)}` : 'Institute X'}</span><b className={user.accountStatus === 'ACTIVE' ? '' : 'is-inactive'}><i />{user.accountStatus}</b><time>{new Date(user.updatedAt).toLocaleDateString()}</time></div>)}</div></section>
    </main>
  );
}
