'use client';

import Image from 'next/image';
import { FormEvent, useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { getRoleHomePath, getSessionHomePath, resolveApplicationRole, storeSession, type AuthProfile } from '../lib/auth-session';
import { useAppLanguage } from '../lib/language';
import LanguageSelector from './language-selector';
import { authUi, commonUi } from './ui-styles';

const subscribe = () => () => undefined;

export default function AuthenticationPage() {
  const router = useRouter();
  const [language, setLanguage] = useAppLanguage();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const homePath = useSyncExternalStore(subscribe, getSessionHomePath, () => undefined);

  useEffect(() => { if (homePath) router.replace(homePath); }, [homePath, router]);

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-request': '1' },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json() as { challengeId?: string; expiresAt?: string; message?: string };
      if (!response.ok || !payload.challengeId || !payload.expiresAt) throw new Error(payload.message ?? 'ส่งรหัส OTP ไม่สำเร็จ');
      setChallengeId(payload.challengeId);
      setExpiresAt(payload.expiresAt);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ส่งรหัส OTP ไม่สำเร็จ');
    } finally { setSubmitting(false); }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const otp = new FormData(event.currentTarget).get('otp');
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-request': '1' },
        body: JSON.stringify({ challengeId, otp }),
      });
      const payload = await response.json() as { expiresAt?: string; user?: AuthProfile; message?: string };
      if (!response.ok || !payload.expiresAt || !payload.user) throw new Error(payload.message ?? 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ');
      storeSession(payload.expiresAt, payload.user);
      router.replace(getRoleHomePath(resolveApplicationRole(payload.user)) ?? '/student');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ');
    } finally { setSubmitting(false); }
  }

  if (homePath !== null) return <main className={commonUi.callbackShell}><section className={commonUi.callbackPanel}><span className={commonUi.spinner} /><h1>กำลังตรวจสอบเซสชัน</h1></section></main>;

  return (
    <main className={authUi.shell}>
      <nav className="fixed top-6 right-8"><LanguageSelector value={language} label="Select language" onChange={setLanguage} /></nav>
      <section className={authUi.panel} aria-labelledby="login-title">
        <header className={authUi.brand}><Image className={authUi.logo} src="/logoX.png" alt="Institute X" width={1238} height={1238} priority /><h1 id="login-title">Institute X</h1></header>
        <div className={authUi.rule} />
        <form className={`${authUi.access} grid gap-4`} onSubmit={challengeId ? verifyOtp : requestOtp}>
          <h2>เข้าสู่ระบบ</h2>
          {!challengeId ? <label className="grid gap-1 text-sm">อีเมลสถาบัน (@x.ac.th)<input className="rounded-md border border-[#ccd1df] px-4 py-3" name="email" type="email" autoComplete="email" pattern="[^@\\s]+@x\\.ac\\.th" placeholder="name@x.ac.th" value={email} onChange={(event) => setEmail(event.target.value)} required /></label> : <>
            <p className="text-sm text-muted">ส่งรหัส 6 หลักไปที่ <strong>{email}</strong> แล้ว รหัสหมดอายุภายใน 5 นาที</p>
            <label className="grid gap-1 text-sm">รหัส OTP<input className="rounded-md border border-[#ccd1df] px-4 py-3 text-center text-xl tracking-[0.35em]" name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus /></label>
          </>}
          {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
          <button className={authUi.loginButton} type="submit" disabled={submitting}>{submitting ? 'กำลังดำเนินการ…' : challengeId ? 'ยืนยันและเข้าสู่ระบบ' : 'ส่งรหัส OTP'}</button>
          {challengeId ? <button className="text-sm underline" type="button" onClick={() => { setChallengeId(''); setExpiresAt(''); setError(''); }}>เปลี่ยนอีเมล / ขอรหัสใหม่</button> : null}
          <p className="text-center text-sm text-muted">ไม่มีการสมัครสมาชิก การเข้าสู่ระบบครั้งแรกด้วยอีเมลที่ยืนยันแล้วจะสร้างบัญชีนักเรียนอัตโนมัติ</p>
          {expiresAt ? <span className="sr-only">OTP expires at {expiresAt}</span> : null}
        </form>
      </section>
    </main>
  );
}
