"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  type ReactNode,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import {
  clearSsoSession,
  hasActiveSsoSession,
  readStoredProfile,
  resolveApplicationRole,
  type SsoProfile,
} from "../../lib/sso-session";
import { commonCopy, shellCopy } from "../../lib/app-copy";
import { useAppLanguage } from "../../lib/language";
import LanguageSelector from "../language-selector";
import ProfileMenu from "../profile-menu";
import { commonUi, workspaceUi } from "../ui-styles";
import styles from "../workspace-sidebar.module.css";

const subscribeToSession = () => () => undefined;

const navigation = [
  { href: "/teacher", label: "overview", icon: "grid" },
  { href: "/teacher/courses", label: "courses", icon: "book" },
  { href: "/teacher/permission", label: "permission", icon: "shield" },
] as const;

function NavIcon({ icon }: { icon: string }) {
  if (icon === "book")
    return (
      <svg viewBox="0 0 24 24">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
        <path d="M4 5.5v16M8 7h8" />
      </svg>
    );
  if (icon === "shield")
    return (
      <svg viewBox="0 0 24 24">
        <path d="M12 3 20 6v5c0 5-3.3 8.4-8 10-4.7-1.6-8-5-8-10V6z" />
        <path d="m9 12 2 2 4-5" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24">
      <rect x="4" y="4" width="6" height="6" />
      <rect x="14" y="4" width="6" height="6" />
      <rect x="4" y="14" width="6" height="6" />
      <rect x="14" y="14" width="6" height="6" />
    </svg>
  );
}

export default function TeacherShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [language, setLanguage] = useAppLanguage();
  const text = commonCopy[language];
  const shell = shellCopy[language];
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sessionReady = useSyncExternalStore(
    subscribeToSession,
    () => true,
    () => false,
  );
  const isAuthenticated = useSyncExternalStore(
    subscribeToSession,
    hasActiveSsoSession,
    () => false,
  );
  const profile: SsoProfile | null = isAuthenticated
    ? readStoredProfile()
    : null;
  const applicationRole = resolveApplicationRole(profile);
  const isTeacher = applicationRole === "TEACHER";

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!sessionReady) return;
    if (!isAuthenticated) router.replace("/");
    else if (applicationRole === "STUDENT") router.replace("/student");
    else if (applicationRole === "APPROVER") router.replace("/approver");
    else if (applicationRole === "OWNER") router.replace("/owner");
    else if (applicationRole === null) {
      clearSsoSession();
      router.replace("/");
    }
  }, [applicationRole, isAuthenticated, router, sessionReady]);

  if (!sessionReady || !isAuthenticated || !isTeacher) {
    return (
      <main className={commonUi.callbackShell}>
        <section className={commonUi.callbackPanel} aria-live="polite">
          <span className={commonUi.spinner} aria-hidden="true" />
          <h1>{text.checking}</h1>
        </section>
      </main>
    );
  }

  const signOut = () => {
    clearSsoSession();
    router.replace("/");
  };
  const currentNavigation = navigation.find((item) =>
    item.href === "/teacher"
      ? pathname === item.href
      : pathname.startsWith(item.href),
  );
  const isCourseEditor = /^\/teacher\/courses\/[^/]+$/.test(pathname);

  return (
    <div className={`${workspaceUi.shell("teacher")} ${styles.shell}`}>
      <aside className={`${workspaceUi.sidebar(mobileNavOpen)} ${styles.sidebar}`}>
        <header className={`${workspaceUi.brandHeader} ${styles.brand}`}>
          <Link className={workspaceUi.brandLink} href="/teacher/courses" aria-label="Institute X teacher courses dashboard">
            <Image src="/logoX.png" alt="" width={44} height={44} priority />
            <span>
              <small>Institute X</small>
              <strong>{shell.teacherWorkspace}</strong>
            </span>
          </Link>
          <button className={styles.closeButton} type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}>×</button>
        </header>
        <nav className={`${workspaceUi.navigation} ${styles.navigation}`} aria-label="Teacher navigation">
          <p className={workspaceUi.navLabel}>Workspace · 01</p>
          {navigation.map((item) => {
            const active =
              item.href === "/teacher"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                className={`${workspaceUi.navLink} ${active ? workspaceUi.navLinkActive : ""}`}
                href={item.href}
                aria-label={shell[item.label]}
                aria-current={active ? "page" : undefined}
                onClick={() => setMobileNavOpen(false)}
              >
                <NavIcon icon={item.icon} />
                <span>{shell[item.label]}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className={workspaceUi.workspace}>
        <header className={isCourseEditor ? `${workspaceUi.topbar} ${styles.topbar} min-[821px]:hidden` : `${workspaceUi.topbar} ${styles.topbar}`}>
          <button
            className={workspaceUi.menuButton}
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
          <div>
            <p>{shell.courseAuthoring}</p>
            <strong>
              {currentNavigation
                ? shell[currentNavigation.label]
                : shell.overview}
            </strong>
          </div>
          <nav aria-label="Teacher account">
            <span className={workspaceUi.rolePill}>Teacher</span>
            <LanguageSelector
              className="max-[700px]:w-[104px]"
              value={language}
              label={text.selectLanguage}
              onChange={setLanguage}
            />
            <ProfileMenu
              profile={profile}
              roleLabel={text.teacherAccount}
              fallbackName="Teacher"
              onSignOut={signOut}
              logoutLabel={text.logout}
              logoutHint={text.logoutHint}
              accountLabel={text.account}
            />
          </nav>
        </header>
        {children}
      </div>
      {mobileNavOpen ? (
        <button
          className={workspaceUi.scrim}
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
    </div>
  );
}
