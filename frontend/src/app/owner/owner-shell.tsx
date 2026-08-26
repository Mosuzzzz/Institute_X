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
  { href: '/owner', label: 'System overview', icon: 'grid' },
  { href: '/owner/users', label: 'Users', icon: 'users' },
  { href: '/owner/courses', label: 'Courses', icon: 'book' },
  { href: '/owner/operations', label: 'Operations', icon: 'pulse' },
] as const;

function NavIcon({ icon }: { icon: string }) {
  if (icon === 'users') return <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M16 6a3 3 0 0 1 0 6M17 14c2.2.5 3.4 2.1 3.5 5" /></svg>;
  if (icon === 'book') return <svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 5.5v16M8 7h8" /></svg>;
  if (icon === 'pulse') return <svg viewBox="0 0 24 24"><path d="M3 13h4l2-6 4 11 2-5h6" /></svg>;
  return <svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><rect x="14" y="14" width="6" height="6" /></svg>;
}

export default function OwnerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isAuthenticated = useSyncExternalStore(subscribeToSession, hasActiveSsoSession, () => false);
  const profile: SsoProfile | null = isAuthenticated ? readStoredProfile() : null;
  const applicationRole = resolveApplicationRole(profile);
  const isOwner = applicationRole === 'OWNER';

  useEffect(() => { document.documentElement.lang = language; }, [language]);
  useEffect(() => {
    if (!isAuthenticated) router.replace('/');
    else if (applicationRole === 'STUDENT') router.replace('/student');
    else if (applicationRole === 'TEACHER') router.replace('/teacher');
    else if (applicationRole === 'APPROVER') router.replace('/approver');
    else if (applicationRole === null) {
      clearSsoSession();
      router.replace('/');
    }
  }, [applicationRole, isAuthenticated, router]);

  if (!isAuthenticated || !isOwner) {
    return <main className="callback-shell"><section className="callback-panel" aria-live="polite"><span className="callback-spinner" aria-hidden="true" /><h1>Checking your Owner account</h1></section></main>;
  }

  const signOut = () => { clearSsoSession(); router.replace('/'); };

  return (
    <div className="teacher-shell owner-shell">
      <aside className={`teacher-sidebar owner-sidebar${mobileNavOpen ? ' is-open' : ''}`}>
        <header><Link href="/owner" aria-label="Institute X Owner home"><Image src="/logoX.png" alt="" width={44} height={44} priority /><span>Owner workspace</span></Link><button type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}>×</button></header>
        <nav aria-label="Owner navigation">
          {navigation.map((item) => {
            const active = item.href === '/owner' ? pathname === item.href : pathname.startsWith(item.href);
            return <Link key={item.href} className={active ? 'is-active' : ''} href={item.href} onClick={() => setMobileNavOpen(false)}><NavIcon icon={item.icon} /><span>{item.label}</span></Link>;
          })}
        </nav>
        <footer><p>System authority</p><strong>{profile?.name ?? profile?.username ?? 'Owner'}</strong><span>{profile?.email}</span></footer>
      </aside>
      <div className="teacher-workspace">
        <header className="teacher-topbar"><button className="teacher-menu-button" type="button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><span /><span /><span /></button><div><p>Institute X</p><strong>System oversight</strong></div><nav aria-label="Owner account"><LanguageSelector className="teacher-language-menu" value={language} label="Select language" onChange={setLanguage} /><ProfileMenu profile={profile} roleLabel="Owner account" fallbackName="Owner" onSignOut={signOut} /></nav></header>
        {children}
      </div>
      {mobileNavOpen ? <button className="teacher-nav-scrim" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} /> : null}
    </div>
  );
}
