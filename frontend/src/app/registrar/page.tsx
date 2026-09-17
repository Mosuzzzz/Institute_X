'use client';

import { useMemo, useState } from 'react';
import { backendApi, MajorDto } from '../../lib/backend-api';
import { useBackendQuery } from '../../lib/use-backend-query';
import ApiState from '../api-state';
import BootstrapIcon from '../bootstrap-icon';
import { staffUi } from '../ui-styles';
import styles from './registrar.module.css';
import { useAppLanguage } from '../../lib/language';
import { translateMajor } from '../../lib/reference-translations';
import { useUiTranslation } from '../../lib/ui-translations';

type Role = 'STUDENT' | 'TEACHER' | 'APPROVER' | 'REGISTRAR' | 'EXECUTIVE';
type User = {
  id: string;
  universityEmail: string;
  fullName: string;
  accountStatus: 'ACTIVE' | 'INACTIVE';
  roles: Array<{ role: Role }>;
  major: (MajorDto & { id: string }) | null;
};
type Audit = {
  id: string;
  oldRoles: Role[];
  newRoles: Role[];
  createdAt: string;
  actor: { fullName: string };
  targetUser: { fullName: string; universityEmail: string };
};
const MANAGED_ROLES: Exclude<Role, 'STUDENT'>[] = ['TEACHER', 'APPROVER', 'REGISTRAR', 'EXECUTIVE'];

function compactMajorLabel(major: MajorDto, language: Parameters<typeof translateMajor>[1]) {
  const translated = translateMajor(major, language);
  const fieldName = translated.split(' — ').at(-1) ?? translated;
  return `${major.code} — ${fieldName}`;
}

export default function RegistrarPage() {
  const t = useUiTranslation();
  const [language] = useAppLanguage();
  const users = useBackendQuery<User[]>('registrar/users');
  const audits = useBackendQuery<Audit[]>('registrar/users/role-audits');
  const majors = useBackendQuery<MajorDto[]>('majors');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? users.data?.filter((user) => `${user.fullName} ${user.universityEmail}`.toLowerCase().includes(term)) : users.data;
  }, [search, users.data]);

  async function mutate(id: string, path: string, init: RequestInit) {
    setBusy(id);
    setMessage(null);
    try {
      await backendApi(path, init);
      await Promise.all([users.refresh(), audits.refresh()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('Unable to update account.'));
    } finally {
      setBusy(null);
    }
  }

  const referenceError = users.error ?? majors.error;
  const loadingReferences = users.loading || majors.loading;

  return (
    <main id="users" data-ui="page" className={`${staffUi.page} grid gap-7`}>
      <section>
        <h1 className="mt-1 text-3xl font-medium">{t('จัดการบทบาทผู้ใช้')}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#687083]">
          {t('ผู้ใช้ต้องยืนยันอีเมล @x.ac.th และเข้าสู่ระบบครั้งแรกด้วยตนเองก่อนจึงจะค้นหาและกำหนดบทบาทได้ ทุกบัญชีคงบทบาท STUDENT เสมอ')}
        </p>
      </section>

      <label className="grid max-w-2xl gap-2 text-sm font-medium">
        {t('ค้นหาด้วยชื่อหรืออีเมล')}
        <span className="relative">
          <BootstrapIcon name="search" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#687083]" />
          <input
            className="min-h-12 w-full rounded-control border border-[#bbc3cf] bg-white pr-4 pl-11 font-normal outline-none transition hover:border-[#8395aa] focus:border-[#063777] focus:ring-2 focus:ring-[#063777]/20"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="name@x.ac.th"
          />
        </span>
      </label>

      {message ? <p role="alert" className="rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{t(message)}</p> : null}

      <section className="overflow-hidden rounded-panel border border-[#d6dbe4] bg-white">
        <header className="flex items-center justify-between gap-4 border-b border-[#d6dbe4] px-5 py-4 sm:px-6">
          <h2 className="font-semibold">{t('ผู้ใช้ที่ยืนยันแล้ว')}</h2>
          <span className="whitespace-nowrap rounded-full bg-[#edf3fa] px-3 py-1 text-xs font-semibold text-[#073d78]">
            {visibleUsers?.length ?? 0}{t(' บัญชี')}
          </span>
        </header>

        {loadingReferences || referenceError ? (
          <ApiState loading={loadingReferences} error={referenceError} />
        ) : (
          <div className="overflow-x-auto">
            <table
              aria-label={t('ผู้ใช้ที่ยืนยันแล้วและการจัดการบทบาท')}
              aria-busy={busy !== null}
              role="table"
              className={`${styles.table} w-full min-w-[1180px] table-fixed text-left text-sm`}
            >
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[31%]" />
                <col className="w-[14%]" />
                <col className="w-[11%]" />
                <col className="w-[22%]" />
              </colgroup>
              <thead className="bg-[#f4f6f9] text-xs tracking-wide text-[#687083] uppercase">
                <tr>
                  <th className="px-5 py-3.5">{t('ผู้ใช้')}</th>
                  <th className="px-5 py-3.5">{t('สาขา')}</th>
                  <th className="px-5 py-3.5">{t('บทบาท')}</th>
                  <th className="px-5 py-3.5">{t('สถานะ')}</th>
                  <th className="px-5 py-3.5">{t('จัดการบทบาท')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers?.map((user) => (
                  <tr role="row" className="border-t border-[#e2e5eb] align-middle" key={user.id}>
                    <td role="cell" className="px-5 py-5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#edf3fa] text-[#073d78]" aria-hidden="true">
                          <BootstrapIcon name="person" className="text-lg" />
                        </span>
                        <span className="min-w-0">
                          <strong className="block truncate font-semibold text-[#202b3c]">{user.fullName}</strong>
                          <span className="block truncate text-xs text-[#687083]" title={user.universityEmail}>{user.universityEmail}</span>
                        </span>
                      </div>
                    </td>
                    <td role="cell" data-label={t('สาขา')} className="px-5 py-5">
                      <div className="group relative min-w-0">
                        <BootstrapIcon name="mortarboard" className="pointer-events-none absolute top-1/2 left-3.5 z-10 -translate-y-1/2 text-base text-[#53647b] transition-colors group-focus-within:text-[#063777]" />
                        <select
                          aria-label={`${t('Major')} — ${user.fullName}`}
                          className={`min-h-11 w-full cursor-pointer appearance-none rounded-control border py-2 pr-10 pl-10 text-sm font-medium outline-none transition-[border-color,background-color,box-shadow] hover:border-[#55779d] focus:border-[#063777] focus:ring-2 focus:ring-[#063777]/20 disabled:cursor-wait disabled:border-[#d6dbe4] disabled:bg-[#f4f6f9] disabled:text-[#7b8492] ${user.major ? 'border-[#b7c8db] bg-white text-[#253247]' : 'border-[#d7b66d] bg-[#fffaf0] text-[#72541d]'}`}
                          disabled={busy === user.id}
                          value={user.major?.id ?? ''}
                          onChange={(event) => void mutate(user.id, `registrar/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ majorId: event.target.value || null }) })}
                        >
                          <option value="">{t('No major assigned')}</option>
                          {majors.data?.map((major) => <option key={major.id} value={major.id}>{compactMajorLabel(major, language)}</option>)}
                        </select>
                        <BootstrapIcon name={busy === user.id ? 'arrow-repeat' : 'chevron-down'} className={`pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-[#53647b] ${busy === user.id ? 'animate-spin' : ''}`} />
                      </div>
                    </td>
                    <td role="cell" data-label={t('บทบาท')} className="px-5 py-5">
                      <div className="flex flex-wrap gap-1.5">
                        {user.roles.map((item) => <span className="whitespace-nowrap rounded-full bg-[#edf3fa] px-2.5 py-1 text-[0.7rem] font-semibold text-[#073d78]" key={item.role}>{t(item.role)}</span>)}
                      </div>
                    </td>
                    <td role="cell" data-label={t('สถานะ')} className="px-5 py-5">
                      <button
                        type="button"
                        disabled={busy === user.id}
                        aria-label={t(user.accountStatus === 'ACTIVE' ? 'Suspend account' : 'Activate account')}
                        className={`inline-flex min-h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-60 ${user.accountStatus === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100'}`}
                        onClick={() => void mutate(user.id, `registrar/users/${user.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: user.accountStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }) })}
                      >
                        <span className={`size-2 rounded-full ${user.accountStatus === 'ACTIVE' ? 'bg-emerald-600' : 'bg-red-600'}`} />
                        {t(user.accountStatus)}
                      </button>
                    </td>
                    <td role="cell" data-label={t('จัดการบทบาท')} className="px-5 py-5">
                      <div className="grid grid-cols-2 gap-2">
                        {MANAGED_ROLES.map((role) => {
                          const assigned = user.roles.some((item) => item.role === role);
                          const actionLabel = t(assigned ? 'Remove {role}' : 'Add {role}', { role: t(role) });
                          return (
                            <button
                              key={role}
                              type="button"
                              aria-label={actionLabel}
                              aria-pressed={assigned}
                              title={actionLabel}
                              disabled={busy === user.id}
                              className={`inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-control border px-2.5 text-xs font-semibold whitespace-nowrap transition disabled:cursor-wait disabled:opacity-60 ${assigned ? 'border-[#073d78] bg-[#073d78] text-white hover:bg-[#063777]' : 'border-[#b7c8db] bg-white text-[#073d78] hover:border-[#073d78] hover:bg-[#edf3fa]'}`}
                              onClick={() => void mutate(user.id, `registrar/users/${user.id}/roles${assigned ? `/${role}` : ''}`, { method: assigned ? 'DELETE' : 'POST', ...(assigned ? {} : { body: JSON.stringify({ role }) }) })}
                            >
                              {assigned ? <BootstrapIcon name="check-lg" /> : <BootstrapIcon name="plus-lg" />}
                              {t(role)}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visibleUsers?.length ? <p className="px-5 py-10 text-center text-sm text-muted">{search ? t('ไม่พบผู้ใช้ที่ตรงกับชื่อหรืออีเมล ลองเปลี่ยนคำค้น') : t('ยังไม่มีบัญชีที่ยืนยันอีเมลแล้ว')}</p> : null}
          </div>
        )}
      </section>

      <section id="role-audits" className="scroll-mt-24" data-section="role-audits">
        <div className="overflow-hidden rounded-panel border border-[#d6dbe4] bg-white">
          <header className="border-b border-[#d6dbe4] px-5 py-4"><h2 className="font-semibold">{t('ประวัติการเปลี่ยนบทบาท')}</h2></header>
          <div className="divide-y divide-[#e2e5eb]">
            {audits.loading || audits.error ? <ApiState loading={audits.loading} error={audits.error} /> : !audits.data?.length ? <p className="px-5 py-10 text-center text-sm text-muted">{t('ยังไม่มีประวัติการเปลี่ยนบทบาท')}</p> : null}
            {audits.data?.slice(0, 20).map((audit) => (
              <article className="px-5 py-4 text-sm" key={audit.id}>
                <strong>{audit.actor.fullName}</strong>{t(' เปลี่ยนบทบาทของ ')}{audit.targetUser.fullName} ({audit.targetUser.universityEmail})
                <p className="mt-1 text-[#687083]">{audit.oldRoles.map((role) => t(role)).join(', ')} → {audit.newRoles.map((role) => t(role)).join(', ')} · {new Date(audit.createdAt).toLocaleString(language)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
