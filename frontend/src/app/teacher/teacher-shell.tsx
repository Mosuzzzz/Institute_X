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
  { href: '/teacher', label: 'Overview', icon: 'grid' },
  { href: '/teacher/courses', label: 'My courses', icon: 'book' },
  { href: '/teacher/permission', label: 'Teaching permission', icon: 'shield' },
] as const;

function NavIcon({ icon }: { icon: string }) {
  if (icon === 'book') return <svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 5.5v16M8 7h8" /></svg>;
  if (icon === 'shield') return <svg viewBox="0 0 24 24"><path d="M12 3 20 6v5c0 5-3.3 8.4-8 10-4.7-1.6-8-5-8-10V6z" /><path d="m9 12 2 2 4-5" /></svg>;
  return <svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><rect x="14" y="14" width="6" height="6" /></svg>;
}

export default function TeacherShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isAuthenticated = useSyncExternalStore(
    subscribeToSession,
    hasActiveSsoSession,
    () => false,
  );
  const profile: SsoProfile | null = isAuthenticated ? readStoredProfile() : null;
  const applicationRole = resolveApplicationRole(profile);
  const isTeacher = applicationRole === 'TEACHER';

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!isAuthenticated) router.replace('/');
    else if (applicationRole === 'STUDENT') router.replace('/student');
    else if (applicationRole === 'APPROVER') router.replace('/approver');
    else if (applicationRole === 'OWNER') router.replace('/owner');
    else if (applicationRole === null) {
      clearSsoSession();
      router.replace('/');
    }
  }, [applicationRole, isAuthenticated, router]);

  if (!isAuthenticated || !isTeacher) {
    return (
      <main className="callback-shell">
        <section className="callback-panel" aria-live="polite">
          <span className="callback-spinner" aria-hidden="true" />
          <h1>Checking your teaching account</h1>
        </section>
      </main>
    );
  }

  const signOut = () => {
    clearSsoSession();
    router.replace('/');
  };

  return (
    <div className="teacher-shell">
      <aside className={`teacher-sidebar${mobileNavOpen ? ' is-open' : ''}`}>
        <header>
          <Link href="/teacher" aria-label="Institute X teacher home">
            <Image src="/logoX.png" alt="" width={44} height={44} priority />
            <span>Teacher workspace</span>
          </Link>
          <button type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}>×</button>
        </header>
        <nav aria-label="Teacher navigation">
          {navigation.map((item) => {
            const active = item.href === '/teacher' ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} className={active ? 'is-active' : ''} href={item.href} onClick={() => setMobileNavOpen(false)}>
                <NavIcon icon={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <footer>
          <p>Signed in as</p>
          <strong>{profile?.name ?? profile?.username ?? 'Teacher'}</strong>
          <span>{profile?.email}</span>
        </footer>
      </aside>

      <div className="teacher-workspace">
        <header className="teacher-topbar">
          <button className="teacher-menu-button" type="button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}>
            <span /><span /><span />
          </button>
          <div>
            <p>Institute X</p>
            <strong>Course authoring</strong>
          </div>
          <nav aria-label="Teacher account">
            <LanguageSelector className="teacher-language-menu" value={language} label="Select language" onChange={setLanguage} />
            <ProfileMenu
              profile={profile}
              roleLabel="Teacher account"
              fallbackName="Teacher"
              onSignOut={signOut}
            />
          </nav>
        </header>
        {children}
      </div>
      {mobileNavOpen ? <button className="teacher-nav-scrim" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} /> : null}
    </div>
  );
}
