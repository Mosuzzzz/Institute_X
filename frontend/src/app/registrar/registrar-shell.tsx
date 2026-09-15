'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { clearAuthSession, endSession, hasActiveSession, readStoredProfile, resolveApplicationRole } from '../../lib/auth-session';
import BootstrapIcon from '../bootstrap-icon';
import ProfileMenu from '../profile-menu';
import { commonUi, workspaceUi } from '../ui-styles';
import styles from '../workspace-sidebar.module.css';
import useWorkspaceNavigation from '../use-workspace-navigation';
import { useUiTranslation } from "../../lib/ui-translations";
import { useAppLanguage } from '../../lib/language';
import LanguageSelector from '../language-selector';


const subscribe = () => () => undefined;

export default function RegistrarShell({ children }: { children: ReactNode }) {
  const t = useUiTranslation();
  const [language, setLanguage] = useAppLanguage();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { sidebarRef, triggerRef } = useWorkspaceNavigation(mobileNavOpen, setMobileNavOpen);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const authenticated = useSyncExternalStore(subscribe, hasActiveSession, () => false);
  const profile = authenticated ? readStoredProfile() : null;
  const role = resolveApplicationRole(profile);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) router.replace('/');
    else if (role !== 'REGISTRAR') {
      const paths = { STUDENT: '/student/courses', TEACHER: '/teacher', APPROVER: '/approver', EXECUTIVE: '/executive' } as const;
      if (role && role in paths) router.replace(paths[role as keyof typeof paths]);
      else { clearAuthSession(); router.replace('/'); }
    }
  }, [authenticated, ready, role, router]);

  if (!ready || !authenticated || role !== 'REGISTRAR') return <main className={commonUi.callbackShell}><section className={commonUi.callbackPanel} role="status"><span className={commonUi.spinner} aria-hidden="true" /><h1>{t("Checking access…")}</h1></section></main>;

  return <div className={`${workspaceUi.shell('teacher')} ${styles.shell}`}>
    <aside ref={sidebarRef} data-open={mobileNavOpen} role={mobileNavOpen ? 'dialog' : undefined} aria-modal={mobileNavOpen || undefined} aria-label={t('Workspace navigation')} className={`${workspaceUi.sidebar(mobileNavOpen)} ${styles.sidebar}`}>
      <header className={`${workspaceUi.brandHeader} ${styles.brand}`}>
        <Link href="/registrar" className={workspaceUi.brandLink} onClick={() => setMobileNavOpen(false)}>
          <Image src="/logoX.png" alt="" width={42} height={42} />
          <span><small>Institute X</small><strong>{t('Registrar')}</strong></span>
        </Link>
        <button className={styles.closeButton} type="button" aria-label={t('Close navigation')} onClick={() => setMobileNavOpen(false)}><BootstrapIcon name="x-lg" /></button>
      </header>
      <nav className={`${workspaceUi.navigation} ${styles.navigation}`} aria-label={t('Role Management')}>
        <Link href="/registrar#users" className={workspaceUi.navLink} onClick={() => setMobileNavOpen(false)}><BootstrapIcon name="people" /><span>{t('จัดการบทบาทผู้ใช้')}</span></Link>
        <Link href="/registrar#role-audits" className={workspaceUi.navLink} onClick={() => setMobileNavOpen(false)}><BootstrapIcon name="clock-history" /><span>{t('ประวัติการเปลี่ยนบทบาท')}</span></Link>
      </nav>
    </aside>
    <div className={workspaceUi.workspace}>
      <header className={`${workspaceUi.topbar} ${styles.topbar}`}>
        <button ref={triggerRef} className={workspaceUi.menuButton} type="button" aria-expanded={mobileNavOpen} aria-label={t('Open navigation')} onClick={() => setMobileNavOpen(true)}><span /><span /><span /></button>
        <div><strong>{t('Role Management')}</strong></div>
        <nav aria-label={t('Registrar')}><LanguageSelector value={language} label={t('Select language')} onChange={setLanguage} /><ProfileMenu profile={profile} roleLabel={t('Registrar')} fallbackName={t('Registrar')} onSignOut={() => void endSession().finally(() => router.replace('/'))} /></nav>
      </header>
      {children}
    </div>
    {mobileNavOpen ? <button className={workspaceUi.scrim} type="button" aria-label={t('Close navigation')} onClick={() => setMobileNavOpen(false)} /> : null}
  </div>;
}
