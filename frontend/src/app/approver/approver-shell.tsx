'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState, useSyncExternalStore } from 'react';
import {
  clearSsoSession,
  hasActiveSsoSession,
  readStoredProfile,
  resolveApplicationRole,
  type SsoProfile,
} from '../../lib/sso-session';
import LanguageSelector, { type Language } from '../language-selector';
import ProfileMenu from '../profile-menu';

const subscribeToSession = () => () => undefined;
const navigation = [
  { href: '/approver', label: 'Review overview', icon: 'grid' },
  { href: '/approver/teacher-requests', label: 'Teacher requests', icon: 'users' },
  { href: '/approver/course-reviews', label: 'Course reviews', icon: 'review' },
] as const;

function NavIcon({ icon }: { icon: string }) {
  if (icon === 'users') return <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M16 6a3 3 0 0 1 0 6M17 14c2.2.5 3.4 2.1 3.5 5" /></svg>;
  if (icon === 'review') return <svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13l2 2 4-4" /></svg>;
  return <svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><rect x="14" y="14" width="6" height="6" /></svg>;
}

export default function ApproverShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isAuthenticated = useSyncExternalStore(subscribeToSession, hasActiveSsoSession, () => false);
  const profile: SsoProfile | null = isAuthenticated ? readStoredProfile() : null;
  const applicationRole = resolveApplicationRole(profile);
  const isApprover = applicationRole === 'APPROVER';

  useEffect(() => { document.documentElement.lang = language; }, [language]);
  useEffect(() => {
    if (!isAuthenticated) router.replace('/');
    else if (applicationRole === 'STUDENT') router.replace('/student');
    else if (applicationRole === 'TEACHER') router.replace('/teacher');
    else if (applicationRole === 'OWNER') router.replace('/owner');
    else if (applicationRole === null) {
      clearSsoSession();
      router.replace('/');
    }
  }, [applicationRole, isAuthenticated, router]);

  if (!isAuthenticated || !isApprover) {
    return <main className="callback-shell"><section className="callback-panel" aria-live="polite"><span className="callback-spinner" aria-hidden="true" /><h1>Checking your Approver account</h1></section></main>;
  }

  const signOut = () => { clearSsoSession(); router.replace('/'); };

  return (
    <div className="teacher-shell approver-shell">
      <aside className={`teacher-sidebar approver-sidebar${mobileNavOpen ? ' is-open' : ''}`}>
        <header><Link href="/approver" aria-label="Institute X Approver home"><Image src="/logoX.png" alt="" width={44} height={44} priority /><span>Approver workspace</span></Link><button type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}>×</button></header>
        <nav aria-label="Approver navigation">
          {navigation.map((item) => {
            const active = item.href === '/approver' ? pathname === item.href : pathname.startsWith(item.href);
            return <Link key={item.href} className={active ? 'is-active' : ''} href={item.href} onClick={() => setMobileNavOpen(false)}><NavIcon icon={item.icon} /><span>{item.label}</span></Link>;
          })}
        </nav>
        <footer><p>Review authority</p><strong>{profile?.name ?? profile?.username ?? 'Approver'}</strong><span>{profile?.email}</span></footer>
      </aside>
      <div className="teacher-workspace">
        <header className="teacher-topbar"><button className="teacher-menu-button" type="button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><span /><span /><span /></button><div><p>Institute X</p><strong>Approval operations</strong></div><nav aria-label="Approver account"><LanguageSelector className="teacher-language-menu" value={language} label="Select language" onChange={setLanguage} /><ProfileMenu profile={profile} roleLabel="Approver account" fallbackName="Approver" onSignOut={signOut} /></nav></header>
        {children}
      </div>
      {mobileNavOpen ? <button className="teacher-nav-scrim" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} /> : null}
    </div>
  );
}
