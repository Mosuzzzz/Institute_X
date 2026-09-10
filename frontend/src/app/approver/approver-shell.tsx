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
  clearAuthSession,
  endSession,
  hasActiveSession,
  readStoredProfile,
  resolveApplicationRole,
  type AuthProfile,
} from "../../lib/auth-session";
import { commonCopy, shellCopy } from "../../lib/app-copy";
import { useAppLanguage } from "../../lib/language";
import LanguageSelector from "../language-selector";
import ProfileMenu from "../profile-menu";
import BootstrapIcon from "../bootstrap-icon";
import { commonUi, workspaceUi } from "../ui-styles";
import styles from "../workspace-sidebar.module.css";

const subscribeToSession = () => () => undefined;
const navigation = [
  { href: "/reviewing", label: "reviewOverview", icon: "grid" },
  { href: "/reviewing/courses", label: "allCourses", icon: "courses" },
  {
    href: "/reviewing/teaching-requests",
    label: "teacherRequests",
    icon: "users",
  },
  { href: "/reviewing/course-reviews", label: "courseReviews", icon: "review" },
] as const;

function NavIcon({ icon }: { icon: string }) {
  const names: Record<string, string> = { grid: "grid", courses: "book", users: "people", review: "file-earmark-check" };
  return <BootstrapIcon name={names[icon] ?? "circle"} />;
}

export default function ApproverShell({ children }: { children: ReactNode }) {
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
    hasActiveSession,
    () => false,
  );
  const profile: AuthProfile | null = isAuthenticated
    ? readStoredProfile()
    : null;
  const applicationRole = resolveApplicationRole(profile);
  const isApprover = applicationRole === "APPROVER";

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    if (!sessionReady) return;
    if (!isAuthenticated) router.replace("/");
    else if (applicationRole === "STUDENT") router.replace("/learning/courses");
    else if (applicationRole === "TEACHER") router.replace("/teaching");
    else if (applicationRole === "EXECUTIVE") router.replace("/dashboard");
    else if (applicationRole === "REGISTRAR") router.replace("/registration");
    else if (applicationRole === null) {
      clearAuthSession();
      router.replace("/");
    }
  }, [applicationRole, isAuthenticated, router, sessionReady]);

  if (!sessionReady || !isAuthenticated || !isApprover) {
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
    void endSession().finally(() => router.replace("/"));
  };
  const currentNavigation = navigation.find((item) =>
    item.href === "/reviewing"
      ? pathname === item.href
      : pathname.startsWith(item.href),
  );


  return (
    <div className={`${workspaceUi.shell("approver")} ${styles.shell}`}>
      <aside className={`${workspaceUi.sidebar(mobileNavOpen)} ${styles.sidebar}`}>
        <header className={`${workspaceUi.brandHeader} ${styles.brand}`}>
          <Link className={workspaceUi.brandLink} href="/reviewing" aria-label="Institute X Approver home">
            <Image src="/logoX.png" alt="" width={44} height={44} priority />
            <span>
              <small>Institute X</small>
              <strong>{shell.approverWorkspace}</strong>
            </span>
          </Link>
          <button className={styles.closeButton} type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}><BootstrapIcon name="x-lg" /></button>
        </header>
        <nav className={`${workspaceUi.navigation} ${styles.navigation}`} aria-label="Approver navigation">
          <p className={workspaceUi.navLabel}>Workspace · 02</p>
          {navigation.map((item) => {
            const active =
              item.href === "/reviewing"
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
        <header className={`${workspaceUi.topbar} ${styles.topbar}`}>
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
            <p>{shell.approvalOperations}</p>
            <strong>
              {currentNavigation
                ? shell[currentNavigation.label]
                : shell.reviewOverview}
            </strong>
          </div>
          <nav aria-label={text.approverAccount}>
            <span className={workspaceUi.rolePill}>Approver</span>
            <LanguageSelector
              className="max-[700px]:w-[104px]"
              value={language}
              label={text.selectLanguage}
              onChange={setLanguage}
            />
            <ProfileMenu
              profile={profile}
              roleLabel={text.approverAccount}
              fallbackName="Approver"
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
