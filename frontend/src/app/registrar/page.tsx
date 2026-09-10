'use client';

import { FormEvent, useState } from 'react';
import { backendApi, MajorDto } from '../../lib/backend-api';
import { useBackendQuery } from '../../lib/use-backend-query';
import BootstrapIcon from '../bootstrap-icon';

type Role = 'STUDENT' | 'TEACHER' | 'APPROVER' | 'REGISTRAR' | 'EXECUTIVE';
type User = { id: string; username: string; universityEmail: string; fullName: string; accountStatus: 'ACTIVE' | 'INACTIVE'; roles: Array<{ role: Role }>; major: (MajorDto & { id: string }) | null };

export default function RegistrarPage() {
  const users = useBackendQuery<User[]>('registrar/users');
  const majors = useBackendQuery<MajorDto[]>('majors');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function mutate(id: string, path: string, init: RequestInit) {
    setBusy(id); setMessage(null);
    try { await backendApi(path, init); await users.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update account.'); }
    finally { setBusy(null); }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy('create'); setMessage(null);
    try {
      const input = Object.fromEntries(form);
      if (!input.majorId) delete input.majorId;
      await backendApi('registrar/users', { method: 'POST', body: JSON.stringify(input) });
      event.currentTarget.reset(); setOpen(false); await users.refresh(); setMessage('สร้างบัญชีเรียบร้อยแล้ว');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to create account.'); }
    finally { setBusy(null); }
  }

  return <main className="mx-auto grid max-w-7xl gap-7 px-5 py-8 md:px-12">
    <section className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold tracking-wider text-[#687083] uppercase">Registrar workspace</p><h1 className="mt-1 text-3xl font-medium">จัดการบัญชีผู้ใช้</h1><p className="mt-2 text-sm text-[#687083]">ทุกบัญชีได้รับ Student role โดยอัตโนมัติ</p></div><button className="flex min-h-11 items-center gap-2 rounded bg-[#073d78] px-4 text-sm font-semibold text-white" onClick={() => setOpen(!open)}><BootstrapIcon name={open ? 'x-lg' : 'person-plus'} />{open ? 'ยกเลิก' : 'สร้างผู้ใช้'}</button></section>
    {message ? <p className="rounded border border-[#cbd6e5] bg-white px-4 py-3 text-sm">{message}</p> : null}
    {open ? <form onSubmit={create} className="grid gap-4 border border-[#d6dbe4] bg-white p-5 md:grid-cols-2"><h2 className="md:col-span-2 text-lg font-semibold">บัญชีใหม่</h2>{[['fullName','ชื่อ-นามสกุล','text'],['username','Username','text'],['email','University email','email'],['password','รหัสผ่านอย่างน้อย 12 ตัว','password']].map(([name,label,type]) => <label className="grid gap-1 text-sm" key={name}>{label}<input className="min-h-11 rounded border border-[#bbc3cf] px-3" name={name} type={type} required minLength={name === 'password' ? 12 : undefined} /></label>)}<label className="grid gap-1 text-sm">สาขา (ไม่บังคับ)<select className="min-h-11 rounded border border-[#bbc3cf] px-3" name="majorId"><option value="">ไม่มีสาขา</option>{majors.data?.map(major => <option value={major.id} key={major.id}>{major.code} — {major.name}</option>)}</select></label><div className="flex items-end"><button disabled={busy === 'create'} className="min-h-11 rounded bg-[#073d78] px-5 text-sm font-semibold text-white disabled:opacity-50">{busy === 'create' ? 'กำลังบันทึก…' : 'บันทึกบัญชี'}</button></div></form> : null}
    <section className="overflow-hidden border border-[#d6dbe4] bg-white"><header className="flex items-center justify-between border-b border-[#d6dbe4] px-5 py-4"><h2 className="font-semibold">ผู้ใช้ทั้งหมด</h2><span className="text-sm text-[#687083]">{users.data?.length ?? 0} บัญชี</span></header>{users.loading ? <p className="p-8 text-center">กำลังโหลด…</p> : users.error ? <p className="p-8 text-center text-red-700">{users.error}</p> : <div className="overflow-x-auto"><table className="w-full min-w-200 text-left text-sm"><thead className="bg-[#f4f6f9] text-xs tracking-wide text-[#687083] uppercase"><tr><th className="p-4">ผู้ใช้</th><th className="p-4">สาขา</th><th className="p-4">Roles</th><th className="p-4">สถานะ</th><th className="p-4">จัดการ</th></tr></thead><tbody>{users.data?.map(user => { const teacher = user.roles.some(item => item.role === 'TEACHER'); return <tr className="border-t border-[#e2e5eb]" key={user.id}><td className="p-4"><strong className="block">{user.fullName}</strong><span className="text-[#687083]">{user.universityEmail} · {user.username}</span></td><td className="p-4">{user.major?.code ?? '—'}</td><td className="p-4"><div className="flex flex-wrap gap-1">{user.roles.map(item => <span className="rounded bg-[#edf3fa] px-2 py-1 text-xs text-[#073d78]" key={item.role}>{item.role}</span>)}</div></td><td className="p-4"><span className={user.accountStatus === 'ACTIVE' ? 'text-emerald-700' : 'text-red-700'}>{user.accountStatus}</span></td><td className="p-4"><div className="flex flex-wrap gap-2"><button disabled={busy === user.id} className="rounded border px-2 py-1" onClick={() => mutate(user.id, `registrar/users/${user.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: user.accountStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }) })}>{user.accountStatus === 'ACTIVE' ? 'ระงับ' : 'เปิดใช้'}</button><button disabled={busy === user.id} className="rounded border px-2 py-1" onClick={() => mutate(user.id, `registrar/users/${user.id}/roles${teacher ? '/TEACHER' : ''}`, { method: teacher ? 'DELETE' : 'POST', ...(teacher ? {} : { body: JSON.stringify({ role: 'TEACHER' }) }) })}>{teacher ? 'ถอน Teacher' : 'เพิ่ม Teacher'}</button></div></td></tr>; })}</tbody></table></div>}</section>
  </main>;
}
