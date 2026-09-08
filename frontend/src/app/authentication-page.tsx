'use client';

import Image from 'next/image';
import { FormEvent, useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { getRoleHomePath, getSessionHomePath, resolveApplicationRole, storeSession, type SsoProfile } from '../lib/sso-session';
import { useAppLanguage } from '../lib/language';
import LanguageSelector from './language-selector';
import { authUi, commonUi } from './ui-styles';

const subscribe = () => () => undefined;

export default function AuthenticationPage() {
  const router = useRouter();
  const [language, setLanguage] = useAppLanguage();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const homePath = useSyncExternalStore(subscribe, getSessionHomePath, () => undefined);

  useEffect(() => { if (homePath) router.replace(homePath); }, [homePath, router]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      const payload = await response.json() as { token?: string; expiresAt?: string; user?: SsoProfile; message?: string };
      if (!response.ok || !payload.token || !payload.expiresAt || !payload.user) throw new Error(payload.message ?? 'เข้าสู่ระบบไม่สำเร็จ');
      storeSession(payload.token, payload.expiresAt, payload.user);
      router.replace(getRoleHomePath(resolveApplicationRole(payload.user)) ?? '/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally { setSubmitting(false); }
  }

  if (homePath !== null) return <main className={commonUi.callbackShell}><section className={commonUi.callbackPanel}><span className={commonUi.spinner} /><h1>กำลังตรวจสอบเซสชัน</h1></section></main>;

  return (
    <main className={authUi.shell}>
      <nav className="fixed top-6 right-8"><LanguageSelector value={language} label="Select language" onChange={setLanguage} /></nav>
      <section className={authUi.panel} aria-labelledby="login-title">
        <header className={authUi.brand}><Image className={authUi.logo} src="/logoX.png" alt="Institute X" width={1238} height={1238} priority /><h1 id="login-title">Institute X</h1></header>
        <div className={authUi.rule} />
        <form className={`${authUi.access} grid gap-4`} onSubmit={login}>
          <h2>เข้าสู่ระบบ</h2>
          <label className="grid gap-1 text-sm">Email<input className="rounded-md border border-[#ccd1df] px-4 py-3" name="email" type="email" autoComplete="username" required /></label>
          <label className="grid gap-1 text-sm">Password<input className="rounded-md border border-[#ccd1df] px-4 py-3" name="password" type="password" autoComplete="current-password" required /></label>
          {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
          <button className={authUi.ssoButton} type="submit" disabled={submitting}>{submitting ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
          <p className="text-center text-sm text-muted">บัญชีผู้ใช้สร้างโดยผู้ดูแลระบบเท่านั้น</p>
        </form>
      </section>
    </main>
  );
}
