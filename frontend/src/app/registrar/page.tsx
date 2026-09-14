'use client';

import { useMemo, useState } from 'react';
import { backendApi, MajorDto } from '../../lib/backend-api';
import { useBackendQuery } from '../../lib/use-backend-query';
import ApiState from '../api-state';
import { staffUi } from '../ui-styles';
import styles from './registrar.module.css';

type Role = 'STUDENT' | 'TEACHER' | 'APPROVER' | 'REGISTRAR' | 'EXECUTIVE';
type User = { id: string; universityEmail: string; fullName: string; accountStatus: 'ACTIVE' | 'INACTIVE'; roles: Array<{ role: Role }>; major: (MajorDto & { id: string }) | null };
type Audit = { id: string; oldRoles: Role[]; newRoles: Role[]; createdAt: string; actor: { fullName: string }; targetUser: { fullName: string; universityEmail: string } };
const MANAGED_ROLES: Exclude<Role, 'STUDENT'>[] = ['TEACHER', 'APPROVER', 'REGISTRAR', 'EXECUTIVE'];

export default function RegistrarPage() {
  const users = useBackendQuery<User[]>('registrar/users');
  const audits = useBackendQuery<Audit[]>('registrar/users/role-audits');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? users.data?.filter((user) => `${user.fullName} ${user.universityEmail}`.toLowerCase().includes(term)) : users.data;
  }, [search, users.data]);

  async function mutate(id: string, path: string, init: RequestInit) {
    setBusy(id); setMessage(null);
    try { await backendApi(path, init); await Promise.all([users.refresh(), audits.refresh()]); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update account.'); }
    finally { setBusy(null); }
  }

  return <main data-ui="page" className={`${staffUi.page} grid gap-7`}>
    <section><h1 className="mt-1 text-3xl font-medium">จัดการบทบาทผู้ใช้</h1><p className="mt-2 text-sm text-[#687083]">ผู้ใช้ต้องยืนยันอีเมล @x.ac.th และเข้าสู่ระบบครั้งแรกด้วยตนเองก่อนจึงจะค้นหาและกำหนดบทบาทได้ ทุกบัญชีคงบทบาท STUDENT เสมอ</p></section>
    <label className="grid max-w-xl gap-2 text-sm font-medium">ค้นหาด้วยชื่อหรืออีเมล<input className="min-h-11 rounded border border-[#bbc3cf] bg-white px-4 font-normal" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="name@x.ac.th" /></label>
    {message ? <p role="alert" className="rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{message}</p> : null}
    <section className="overflow-hidden border border-[#d6dbe4] bg-white"><header className="flex items-center justify-between border-b border-[#d6dbe4] px-5 py-4"><h2 className="font-semibold">ผู้ใช้ที่ยืนยันแล้ว</h2><span className="text-sm text-[#687083]">{visibleUsers?.length ?? 0} บัญชี</span></header>{users.loading || users.error ? <ApiState loading={users.loading} error={users.error} /> : <div className="overflow-x-auto"><table aria-label="ผู้ใช้ที่ยืนยันแล้วและการจัดการบทบาท" aria-busy={busy !== null} role="table" className={`${styles.table} w-full min-w-240 text-left text-sm`}><thead className="bg-[#f4f6f9] text-xs tracking-wide text-[#687083] uppercase"><tr><th className="p-4">ผู้ใช้</th><th className="p-4">สาขา</th><th className="p-4">บทบาท</th><th className="p-4">สถานะ</th><th className="p-4">จัดการบทบาท</th></tr></thead><tbody>{visibleUsers?.map(user => <tr role="row" className="border-t border-[#e2e5eb]" key={user.id}><td role="cell" className="p-4"><strong className="block">{user.fullName}</strong><span className="text-[#687083]">{user.universityEmail}</span></td><td role="cell" data-label="สาขา" className="p-4">{user.major?.code ?? '—'}</td><td role="cell" data-label="บทบาท" className="p-4"><div className="flex flex-wrap gap-1">{user.roles.map(item => <span className="rounded bg-[#edf3fa] px-2 py-1 text-xs text-[#073d78]" key={item.role}>{item.role}</span>)}</div></td><td role="cell" data-label="สถานะ" className="p-4"><button disabled={busy === user.id} className={`rounded border px-2 py-1 ${user.accountStatus === 'ACTIVE' ? 'text-emerald-700' : 'text-red-700'}`} onClick={() => mutate(user.id, `registrar/users/${user.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: user.accountStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }) })}>{user.accountStatus}</button></td><td role="cell" data-label="จัดการบทบาท" className="p-4"><div className="flex flex-wrap gap-2">{MANAGED_ROLES.map(role => { const assigned = user.roles.some(item => item.role === role); return <button key={role} disabled={busy === user.id} className={`rounded border px-2 py-1 ${assigned ? 'border-red-200 text-red-700' : 'border-[#b7c8db] text-[#073d78]'}`} onClick={() => mutate(user.id, `registrar/users/${user.id}/roles${assigned ? `/${role}` : ''}`, { method: assigned ? 'DELETE' : 'POST', ...(assigned ? {} : { body: JSON.stringify({ role }) }) })}>{assigned ? `ถอน ${role}` : `เพิ่ม ${role}`}</button>; })}</div></td></tr>)}</tbody></table>{!visibleUsers?.length ? <p className="px-5 py-10 text-center text-sm text-muted">{search ? "ไม่พบผู้ใช้ที่ตรงกับชื่อหรืออีเมล ลองเปลี่ยนคำค้น" : "ยังไม่มีบัญชีที่ยืนยันอีเมลแล้ว"}</p> : null}</div>}</section>
    <section className="border border-[#d6dbe4] bg-white"><header className="border-b border-[#d6dbe4] px-5 py-4"><h2 className="font-semibold">ประวัติการเปลี่ยนบทบาท</h2></header><div className="divide-y divide-[#e2e5eb]">{audits.loading || audits.error ? <ApiState loading={audits.loading} error={audits.error} /> : !audits.data?.length ? <p className="px-5 py-10 text-center text-sm text-muted">ยังไม่มีประวัติการเปลี่ยนบทบาท</p> : null}{audits.data?.slice(0, 20).map(audit => <article className="px-5 py-4 text-sm" key={audit.id}><strong>{audit.actor.fullName}</strong> เปลี่ยนบทบาทของ {audit.targetUser.fullName} ({audit.targetUser.universityEmail})<p className="mt-1 text-[#687083]">{audit.oldRoles.join(', ')} → {audit.newRoles.join(', ')} · {new Date(audit.createdAt).toLocaleString()}</p></article>)}</div></section>
  </main>;
}
