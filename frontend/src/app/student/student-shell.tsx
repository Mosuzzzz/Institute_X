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
    <div className="min-h-svh bg-white text-[#20243a] motion-reduce:[&_*]:transition-none">
      <header className="relative z-20 grid min-h-24 grid-cols-[72px_minmax(260px,820px)_minmax(320px,1fr)] items-center gap-[clamp(22px,4vw,64px)] border-b border-[#d9dce7] bg-white px-[clamp(24px,3vw,58px)] py-3.5 max-[1180px]:grid-cols-[54px_minmax(220px,1fr)_auto] max-[1180px]:gap-[18px] max-[1180px]:px-6 max-[820px]:min-h-0 max-[820px]:grid-cols-[48px_minmax(0,1fr)] max-[820px]:px-[18px] max-[820px]:pt-3 max-[820px]:pb-4">
        <Link className="grid h-[52px] w-[52px] place-items-center max-[820px]:h-11 max-[820px]:w-11" href="/student" aria-label="Institute X student home">
          <Image className="h-[42px] w-[42px] object-contain max-[820px]:h-[38px] max-[820px]:w-[38px]" src="/logoX.png" alt="" width={52} height={52} priority />
        </Link>

        <form className="grid h-[58px] grid-cols-[24px_minmax(0,1fr)] items-center gap-3 rounded-[30px] border border-[#ccd1df] bg-[#f5f7fa] px-[22px] focus-within:border-focus focus-within:shadow-[0_0_0_3px_rgb(23_125_209_/_14%)] max-[820px]:col-span-full max-[820px]:row-start-2 max-[820px]:h-[50px]" action="/student/courses" role="search">
          <svg className="w-[22px] fill-none stroke-[#747b92] [stroke-width:1.7]" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <label className="sr-only" htmlFor="course-search">Search courses</label>
          <input className="w-full border-0 bg-transparent text-base text-[#20243a] outline-0 placeholder:text-[#82899d]" id="course-search" name="q" type="search" placeholder={text.search} />
        </form>

        <nav className="flex items-center justify-end gap-[clamp(18px,2.4vw,38px)] max-[1180px]:gap-4 max-[820px]:col-start-2 max-[820px]:row-start-1" aria-label="Student account">
          <Link className={`whitespace-nowrap text-[0.95rem] text-[#20243a] no-underline hover:text-[#073d78] hover:underline hover:underline-offset-[6px] max-[820px]:text-[0.85rem] max-[540px]:hidden ${pathname === '/student/learning' ? 'text-[#073d78] underline underline-offset-[6px]' : ''}`} href="/student/learning">
            {text.myLearning}
          </Link>
          <LanguageSelector
            className="max-[820px]:w-24 max-[820px]:[&_button:first-child]:text-[0.84rem]"
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
        <nav className="sticky top-0 z-15 overflow-x-auto border-b border-[#e5e7ef] bg-white shadow-[0_7px_15px_rgb(31_42_68_/_5%)] [scrollbar-width:thin]" aria-label="Course categories">
          <div className="flex min-h-[62px] w-max min-w-full items-center justify-center gap-[clamp(20px,2vw,38px)] px-7 max-[820px]:min-h-[54px] max-[820px]:justify-start max-[820px]:px-[18px]">
            {categories.map((category) => <Link className="whitespace-nowrap text-[0.9rem] text-[#353a4d] no-underline hover:text-[#073d78] hover:underline hover:underline-offset-[7px] focus-visible:text-[#073d78] focus-visible:underline focus-visible:underline-offset-[7px]" key={category.key} href={category.href}>{category.label}</Link>)}
          </div>
        </nav>
      ) : null}

      {children}
    </div>
  );
}
