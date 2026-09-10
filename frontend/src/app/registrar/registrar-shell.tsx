'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useSyncExternalStore } from 'react';
import { clearAuthSession, endSession, hasActiveSession, readStoredProfile, resolveApplicationRole } from '../../lib/auth-session';
import BootstrapIcon from '../bootstrap-icon';
import ProfileMenu from '../profile-menu';

const subscribe = () => () => undefined;

export default function RegistrarShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const authenticated = useSyncExternalStore(subscribe, hasActiveSession, () => false);
  const profile = authenticated ? readStoredProfile() : null;
  const role = resolveApplicationRole(profile);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) router.replace('/');
    else if (role !== 'REGISTRAR') {
      const paths = { STUDENT: '/learning/courses', TEACHER: '/teaching', APPROVER: '/reviewing', EXECUTIVE: '/dashboard' } as const;
      if (role && role in paths) router.replace(paths[role as keyof typeof paths]);
      else { clearAuthSession(); router.replace('/'); }
    }
  }, [authenticated, ready, role, router]);

  if (!ready || !authenticated || role !== 'REGISTRAR') return <main className="grid min-h-screen place-items-center"><span>Checking access…</span></main>;

  return <div className="min-h-screen bg-[#f5f7fa] text-[#20243a]">
    <header className="flex min-h-18 items-center justify-between border-b border-[#d6dbe4] bg-white px-6 md:px-12">
      <div className="flex items-center gap-3"><Image src="/logoX.png" alt="" width={42} height={42} /><div><small className="block text-[#687083]">Institute X</small><strong>User Registration</strong></div></div>
      <div className="flex items-center gap-3"><span className="hidden items-center gap-2 rounded bg-[#edf3fa] px-3 py-2 text-sm text-[#073d78] sm:flex"><BootstrapIcon name="person-badge" /> Registrar</span><ProfileMenu profile={profile} roleLabel="Registrar" fallbackName="Registrar" onSignOut={() => void endSession().finally(() => router.replace('/'))} /></div>
    </header>
    {children}
  </div>;
}
