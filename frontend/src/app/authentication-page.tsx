'use client';

import Image from 'next/image';
import { FormEvent, useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { getRoleHomePath, getSessionHomePath, resolveApplicationRole, storeSession, type AuthProfile } from '../lib/auth-session';
import { useAppLanguage } from '../lib/language';
import LanguageSelector from './language-selector';
import BootstrapIcon from './bootstrap-icon';
import { authUi, commonUi } from './ui-styles';
import { useUiTranslation } from "../lib/ui-translations";


const subscribe = () => () => undefined;

export default function AuthenticationPage() {
  const t = useUiTranslation();
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
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^@\s]+@x\.ac\.th$/.test(normalizedEmail)) {
      setError(t("กรุณาใช้อีเมลสถาบัน @x.ac.th"));
      return;
    }
    setEmail(normalizedEmail);
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-request': '1' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const payload = await response.json() as { challengeId?: string; expiresAt?: string; message?: string };
      if (!response.ok || !payload.challengeId || !payload.expiresAt) throw new Error(payload.message ?? t("ส่งรหัส OTP ไม่สำเร็จ"));
      setChallengeId(payload.challengeId);
      setExpiresAt(payload.expiresAt);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("ส่งรหัส OTP ไม่สำเร็จ"));
    } finally { setSubmitting(false); }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const otp = String(new FormData(event.currentTarget).get('otp') ?? '').trim();
    if (!/^[0-9]{6}$/.test(otp)) {
      setError(t("กรุณากรอกรหัส OTP เป็นตัวเลข 6 หลัก"));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-request': '1' },
        body: JSON.stringify({ challengeId, otp }),
      });
      const payload = await response.json() as { expiresAt?: string; user?: AuthProfile; message?: string };
      if (!response.ok || !payload.expiresAt || !payload.user) throw new Error(payload.message ?? t("รหัส OTP ไม่ถูกต้องหรือหมดอายุ"));
      storeSession(payload.expiresAt, payload.user);
      router.replace(getRoleHomePath(resolveApplicationRole(payload.user)) ?? '/student');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("รหัส OTP ไม่ถูกต้องหรือหมดอายุ"));
    } finally { setSubmitting(false); }
  }

  if (homePath !== null) return <main className={commonUi.callbackShell}><section className={commonUi.callbackPanel}><span className={commonUi.spinner} /><h1>{t("Checking your session")}</h1></section></main>;

  return (
    <main className={authUi.shell}>
      <nav className="absolute top-4 right-4 sm:top-6 sm:right-8"><LanguageSelector value={language} label={t("Select language")} onChange={setLanguage} /></nav>
      <section className={`${authUi.panel} relative`} aria-labelledby="login-title">
        {challengeId ? (
          <button
            className="absolute top-4 left-4 grid size-11 place-items-center rounded-full text-xl text-muted transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 sm:top-6 sm:left-6"
            type="button"
            aria-label={t("เปลี่ยนอีเมล / ขอรหัสใหม่")}
            title={t("เปลี่ยนอีเมล / ขอรหัสใหม่")}
            disabled={submitting}
            onClick={() => { setChallengeId(''); setExpiresAt(''); setError(''); }}
          >
            <BootstrapIcon name="arrow-left" />
          </button>
        ) : null}
        <header className={authUi.brand}><Image className={authUi.logo} src="/logoX.png" alt="Institute X" width={1238} height={1238} priority /><h1 id="login-title">Institute X</h1></header>
        <div className={authUi.rule} />
        <form noValidate aria-busy={submitting} className={`${authUi.access} grid gap-4`} onSubmit={challengeId ? verifyOtp : requestOtp}>
          <h2>{t("เข้าสู่ระบบ")}</h2>
          {!challengeId ? <label className="grid gap-1 text-sm">{t("อีเมลสถาบัน (@x.ac.th)")}<input className="rounded-md border border-[#ccd1df] px-4 py-3" aria-invalid={Boolean(error)} aria-describedby={error ? "auth-error" : undefined} name="email" type="email" autoComplete="email" placeholder="name@x.ac.th" value={email} onChange={(event) => setEmail(event.target.value)} required /></label> : <>
            <p className="text-sm text-muted">{t("ส่งรหัส 6 หลักไปที่ ")}<strong>{email}</strong>{t(" แล้ว รหัสหมดอายุภายใน 5 นาที")}</p>
            <label className="grid gap-1 text-sm">{t("รหัส OTP")}<input className="rounded-md border border-[#ccd1df] px-4 py-3 text-center text-xl tracking-[0.35em]" aria-invalid={Boolean(error)} aria-describedby={error ? "auth-error" : undefined} name="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus /></label>
          </>}
          {error ? <p id="auth-error" className="rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{t(error)}</p> : null}
          <button className={authUi.loginButton} type="submit" disabled={submitting}>{submitting ? t("กำลังดำเนินการ…") : challengeId ? t("ยืนยันและเข้าสู่ระบบ") : t("ส่งรหัส OTP")}</button>
          {expiresAt ? <span className="sr-only">{t("OTP expires at ")}{expiresAt}</span> : null}
        </form>
      </section>
    </main>
  );
}
