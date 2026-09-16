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

import useWorkspaceNavigation from '../use-workspace-navigation';
import { useUiTranslation } from "../../lib/ui-translations";


const subscribeToSession = () => () => undefined;
const navigation = [
  { href: "/approver/course-reviews", label: "courseReviews", icon: "review" },
  { href: "/approver/course-reports", label: "courseReports", icon: "flag" },
] as const;

function NavIcon({ icon }: { icon: string }) {
  const names: Record<string, string> = { review: "file-earmark-check", flag: "flag" };
  return <BootstrapIcon name={names[icon] ?? "circle"} />;
}

export default function ApproverShell({ children }: { children: ReactNode }) {
  const t = useUiTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [language, setLanguage] = useAppLanguage();
  const text = commonCopy[language];
  const shell = shellCopy[language];
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { sidebarRef, triggerRef } = useWorkspaceNavigation(mobileNavOpen, setMobileNavOpen);
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
    else if (applicationRole === "STUDENT") router.replace("/student/courses");
    else if (applicationRole === "TEACHER") router.replace("/teacher");
    else if (applicationRole === "EXECUTIVE") router.replace("/executive");
    else if (applicationRole === "REGISTRAR") router.replace("/registrar");
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
  const currentNavigation = navigation.find((item) => pathname.startsWith(item.href));


  return (
    <div className={`${workspaceUi.shell("approver")} ${styles.shell}`}>
      <aside ref={sidebarRef} data-open={mobileNavOpen} role={mobileNavOpen ? "dialog" : undefined} aria-modal={mobileNavOpen || undefined} aria-label={t("Workspace navigation")} className={`${workspaceUi.sidebar(mobileNavOpen)} ${styles.sidebar}`}>
        <header className={`${workspaceUi.brandHeader} ${styles.brand}`}>
          <Link className={workspaceUi.brandLink} href="/approver" aria-label={t("Institute X Approver home")}>
            <Image src="/logoX.png" alt="" width={44} height={44} priority />
            <span>
              <small>Institute X</small>
              <strong>{shell.approverWorkspace}</strong>
            </span>
          </Link>
          <button className={styles.closeButton} type="button" aria-label={t("Close navigation")} onClick={() => setMobileNavOpen(false)}><BootstrapIcon name="x-lg" /></button>
        </header>
        <nav className={`${workspaceUi.navigation} ${styles.navigation}`} aria-label={t("Approver navigation")}>
          <p className={workspaceUi.navLabel}>{t("Workspace · 02")}</p>
          {navigation.map((item) => {
            const active = pathname.startsWith(item.href);
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
            ref={triggerRef}
            aria-expanded={mobileNavOpen}
            className={workspaceUi.menuButton}
            type="button"
            aria-label={t("Open navigation")}
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
            <LanguageSelector
              className="max-[700px]:w-[104px]"
              value={language}
              label={text.selectLanguage}
              onChange={setLanguage}
            />
            <ProfileMenu
              profile={profile}
              roleLabel={text.approverAccount}
              fallbackName={t("Approver")}
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
          aria-label={t("Close navigation")}
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
    </div>
  );
}
