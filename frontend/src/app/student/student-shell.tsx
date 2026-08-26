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
import { categories } from './course-data';

const subscribeToSession = () => () => undefined;

export default function StudentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');
  const isAuthenticated = useSyncExternalStore(
    subscribeToSession,
    hasActiveSsoSession,
    () => false,
  );
  const profile: SsoProfile | null = isAuthenticated ? readStoredProfile() : null;
  const applicationRole = resolveApplicationRole(profile);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/');
    } else if (
      applicationRole === 'TEACHER' ||
      applicationRole === 'APPROVER' ||
      applicationRole === 'OWNER'
    ) {
      router.replace(
        applicationRole === 'TEACHER'
          ? '/teacher'
          : applicationRole === 'APPROVER'
            ? '/approver'
            : '/owner',
      );
    }
  }, [applicationRole, isAuthenticated, router]);

  if (
    isAuthenticated !== true ||
    applicationRole === 'TEACHER' ||
    applicationRole === 'APPROVER' ||
    applicationRole === 'OWNER'
  ) {
    return (
      <main className="callback-shell">
        <section className="callback-panel" aria-live="polite">
          <span className="callback-spinner" aria-hidden="true" />
          <h1>Checking your session</h1>
        </section>
      </main>
    );
  }

  const signOut = () => {
    clearSsoSession();
    router.replace('/');
  };

  return (
    <div className="student-shell">
      <header className="student-header">
        <Link className="student-brand" href="/student" aria-label="Institute X student home">
          <Image src="/logoX.png" alt="" width={52} height={52} priority />
        </Link>

        <form className="student-search" action="/student/courses" role="search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <label className="visually-hidden" htmlFor="course-search">Search courses</label>
          <input id="course-search" name="q" type="search" placeholder="Search for anything" />
        </form>

        <nav className="student-actions" aria-label="Student account">
          <Link className={pathname === '/student/learning' ? 'is-active' : ''} href="/student/learning">
            My learning
          </Link>
          <LanguageSelector
            className="student-language-menu"
            value={language}
            label="Select language"
            onChange={setLanguage}
          />
          <ProfileMenu
            profile={profile}
            roleLabel="Student account"
            fallbackName="Student"
            onSignOut={signOut}
          />
        </nav>
      </header>

      {!pathname.startsWith('/student/courses/') ? (
        <nav className="category-nav" aria-label="Course categories">
          <div className="category-track">
            {categories.map((category) => {
              const href = category === 'All' ? '/student/courses' : `/student/courses?category=${encodeURIComponent(category)}`;
              return <Link key={category} href={href}>{category}</Link>;
            })}
          </div>
        </nav>
      ) : null}

      {children}
    </div>
  );
}
