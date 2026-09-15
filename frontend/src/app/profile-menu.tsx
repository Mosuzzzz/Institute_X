'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { AuthProfile } from '../lib/auth-session';
import { getRoleHomePath, setActiveRole } from '../lib/auth-session';
import BootstrapIcon from './bootstrap-icon';
import { useUiTranslation } from "../lib/ui-translations";


type ProfileMenuProps = {
  profile: AuthProfile | null;
  roleLabel: string;
  fallbackName: string;
  onSignOut: () => void;
  logoutLabel?: string;
  logoutHint?: string;
  accountLabel?: string;
};

export default function ProfileMenu({
  profile,
  roleLabel,
  fallbackName,
  onSignOut,
  logoutLabel = 'Log out',
  logoutHint = 'End this browser session',
  accountLabel = 'Institute X account',
}: ProfileMenuProps) {
  const t = useUiTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const displayName = profile?.name ?? profile?.email ?? t(fallbackName);
  const email = profile?.email ?? t(accountLabel);
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const openAndFocusMenu = () => {
    setIsOpen(true);
    requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    });
  };

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        ref={triggerRef}
        className="group flex h-11 min-w-[66px] cursor-pointer items-center justify-end gap-[5px] border border-transparent bg-transparent p-0 text-[#171821] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[rgb(23_125_209_/_30%)] max-[540px]:h-11 max-[540px]:min-w-[58px]"
        type="button"
        aria-label={t('Open profile menu for {name}', { name: displayName })}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            openAndFocusMenu();
          }
        }}
      >
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#171821] text-[0.82rem] font-bold text-white group-hover:bg-[#073d78] max-[540px]:h-11 max-[540px]:w-11">{initials}</span>
        <BootstrapIcon name="chevron-down" className={`text-sm transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen ? (
        <div id={menuId} className="absolute top-[calc(100%+12px)] right-0 z-80 w-[min(300px,calc(100vw-32px))] max-h-[calc(100svh-96px)] overflow-y-auto overscroll-contain rounded-panel border border-[#d4d8e1] bg-white shadow-[0_18px_42px_rgb(25_35_52_/_18%)]" role="menu" aria-label={t("Profile menu")} onKeyDown={(event) => {
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
          const current = items.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
          items[next]?.focus();
        }}>
          <div className="h-1 bg-[#073d78]" aria-hidden="true" />
          <header className="grid grid-cols-[50px_minmax(0,1fr)] items-center gap-[13px] px-[18px] pt-5 pb-3.5">
            <div className="grid h-[50px] w-[50px] place-items-center rounded-full bg-[#172034] text-[0.86rem] font-extrabold text-white" aria-hidden="true">{initials}</div>
            <div className="grid min-w-0 gap-1"><strong className="truncate whitespace-nowrap text-[0.9rem] text-[#20243a]">{displayName}</strong><span className="truncate whitespace-nowrap text-[0.72rem] text-[#58677c]">{email}</span></div>
          </header>
          <div className="mr-[18px] mb-[17px] ml-[81px] flex items-center gap-[7px] text-[0.7rem] tracking-[0.05em] text-[#536073] uppercase"><span className="h-[7px] w-[7px] rounded-full bg-[#2a8864] shadow-[0_0_0_3px_#e5f4ed]" />{t(roleLabel)}</div>
          <div className="h-px bg-[#e2e4ea]" aria-hidden="true" />
          {(profile?.roles?.length ?? 0) > 1 ? (
            <div className="grid gap-1 border-b border-[#e2e4ea] p-3" role="group" aria-label={t("Switch dashboard")}>
              {profile!.roles!.map((role) => (
                <button role="menuitem" key={role} className="rounded px-3 py-2 text-left text-sm hover:bg-[#eef4fb]" type="button" onClick={() => {
                  const target = setActiveRole(role) ?? getRoleHomePath(role);
                  if (target) window.location.assign(target);
                }}>{t("Dashboard: ")}{t(role)}</button>
              ))}
            </div>
          ) : null}
          <button
            className="grid min-h-[68px] w-full cursor-pointer grid-cols-[24px_minmax(0,1fr)] items-center gap-[13px] border-0 bg-white px-[18px] py-[13px] text-left text-[#8d3039] hover:bg-[#fff3f4] focus-visible:bg-[#fff3f4] focus-visible:outline-3 focus-visible:-outline-offset-4 focus-visible:outline-[#c45761]"
            type="button"
            role="menuitem"
            onClick={onSignOut}
          >
            <BootstrapIcon name="box-arrow-right" className="text-[23px]" />
            <span className="grid gap-[3px]"><strong className="text-[0.84rem]">{t(logoutLabel)}</strong><small className="text-[0.68rem] text-[#8b7377]">{t(logoutHint)}</small></span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
