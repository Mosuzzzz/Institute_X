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

const subscribeToSession = () => () => undefined;
const navigation = [
  { href: "/executive", label: "systemOverview", icon: "grid" },
] as const;

function NavIcon({ icon }: { icon: string }) {
  const names: Record<string, string> = { grid: "grid" };
  return <BootstrapIcon name={names[icon] ?? "circle"} />;
}

export default function OwnerShell({ children }: { children: ReactNode }) {
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
  const isOwner = applicationRole === "EXECUTIVE";

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    if (!sessionReady) return;
    if (!isAuthenticated) router.replace("/");
    else if (applicationRole === "STUDENT") router.replace("/student/courses");
    else if (applicationRole === "TEACHER") router.replace("/teacher");
    else if (applicationRole === "APPROVER") router.replace("/approver");
    else if (applicationRole === "REGISTRAR") router.replace("/registrar");
    else if (applicationRole === null) {
      clearAuthSession();
      router.replace("/");
    }
  }, [applicationRole, isAuthenticated, router, sessionReady]);

  if (!sessionReady || !isAuthenticated || !isOwner) {
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
    item.href === "/executive"
      ? pathname === item.href
      : pathname.startsWith(item.href),
  );


  return (
    <div className={`${workspaceUi.shell("owner")} ${styles.shell}`}>
      <aside ref={sidebarRef} data-open={mobileNavOpen} role={mobileNavOpen ? "dialog" : undefined} aria-modal={mobileNavOpen || undefined} aria-label="Workspace navigation" className={`${workspaceUi.sidebar(mobileNavOpen)} ${styles.sidebar}`}>
        <header className={`${workspaceUi.brandHeader} ${styles.brand}`}>
          <Link className={workspaceUi.brandLink} href="/executive" aria-label="Institute X Executive home">
            <Image src="/logoX.png" alt="" width={44} height={44} priority />
            <span>
              <small>Institute X</small>
              <strong>{shell.ownerWorkspace}</strong>
            </span>
          </Link>
          <button className={styles.closeButton} type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}><BootstrapIcon name="x-lg" /></button>
        </header>
        <nav className={`${workspaceUi.navigation} ${styles.navigation}`} aria-label="Executive navigation">
          <p className={workspaceUi.navLabel}>Workspace · 03</p>
          {navigation.map((item) => {
            const active =
              item.href === "/executive"
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
            ref={triggerRef}
            aria-expanded={mobileNavOpen}
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
            <p>{shell.systemOversight}</p>
            <strong>
              {currentNavigation
                ? shell[currentNavigation.label]
                : shell.systemOverview}
            </strong>
          </div>
          <nav aria-label={text.ownerAccount}>
            <span className={workspaceUi.rolePill}>Executive</span>
            <LanguageSelector
              className="max-[700px]:w-[104px]"
              value={language}
              label={text.selectLanguage}
              onChange={setLanguage}
            />
            <ProfileMenu
              profile={profile}
              roleLabel={text.ownerAccount}
              fallbackName="Executive"
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
