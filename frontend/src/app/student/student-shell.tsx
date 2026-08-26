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
import type { CategoryDto } from '../../lib/backend-api';
import { commonCopy } from '../../lib/app-copy';
import { useAppLanguage } from '../../lib/language';
import { translateCategory } from '../../lib/reference-translations';
import { useBackendQuery } from '../../lib/use-backend-query';
import LanguageSelector from '../language-selector';
import ProfileMenu from '../profile-menu';

const subscribeToSession = () => () => undefined;

export default function StudentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [language, setLanguage] = useAppLanguage();
  const text = commonCopy[language];
  const sessionReady = useSyncExternalStore(subscribeToSession, () => true, () => false);
  const isAuthenticated = useSyncExternalStore(
    subscribeToSession,
    hasActiveSsoSession,
    () => false,
  );
  const profile: SsoProfile | null = isAuthenticated ? readStoredProfile() : null;
  const applicationRole = resolveApplicationRole(profile);
  const categoriesQuery = useBackendQuery<CategoryDto[]>(
    isAuthenticated && applicationRole === 'STUDENT' ? 'categories' : null,
  );
  const categories = [
    { key: 'all', label: text.all, href: '/student/courses' },
    ...(categoriesQuery.data?.map((category) => ({ key: category.slug, label: translateCategory(category, language), href: `/student/courses?category=${encodeURIComponent(category.slug)}` })) ?? []),
  ];

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!sessionReady) return;
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
  }, [applicationRole, isAuthenticated, router, sessionReady]);

  if (
    !sessionReady ||
    isAuthenticated !== true ||
    applicationRole === 'TEACHER' ||
    applicationRole === 'APPROVER' ||
    applicationRole === 'OWNER'
  ) {
    return (
      <main className="callback-shell">
        <section className="callback-panel" aria-live="polite">
          <span className="callback-spinner" aria-hidden="true" />
          <h1>{text.checking}</h1>
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
          <input id="course-search" name="q" type="search" placeholder={text.search} />
        </form>

        <nav className="student-actions" aria-label="Student account">
          <Link className={pathname === '/student/learning' ? 'is-active' : ''} href="/student/learning">
            {text.myLearning}
          </Link>
          <LanguageSelector
            className="student-language-menu"
            value={language}
            label={text.selectLanguage}
            onChange={setLanguage}
          />
          <ProfileMenu
            profile={profile}
            roleLabel={text.studentAccount}
            fallbackName="Student"
            onSignOut={signOut}
            logoutLabel={text.logout}
            logoutHint={text.logoutHint}
            accountLabel={text.account}
          />
        </nav>
      </header>

      {!pathname.startsWith('/student/courses/') ? (
        <nav className="category-nav" aria-label="Course categories">
          <div className="category-track">
            {categories.map((category) => <Link key={category.key} href={category.href}>{category.label}</Link>)}
          </div>
        </nav>
      ) : null}

      {children}
    </div>
  );
}
