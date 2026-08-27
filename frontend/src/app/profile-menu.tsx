'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { SsoProfile } from '../lib/sso-session';

type ProfileMenuProps = {
  profile: SsoProfile | null;
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
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const displayName = profile?.name ?? profile?.username ?? fallbackName;
  const email = profile?.email ?? accountLabel;
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
        className="group flex h-11 min-w-[66px] cursor-pointer items-center justify-end gap-[5px] border border-transparent bg-transparent p-0 text-[#171821] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[rgb(23_125_209_/_30%)] max-[540px]:h-10 max-[540px]:min-w-[58px]"
        type="button"
        aria-label={`Open profile menu for ${displayName}`}
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
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#171821] text-[0.82rem] font-bold text-white group-hover:bg-[#073d78] max-[540px]:h-10 max-[540px]:w-10">{initials}</span>
        <svg className={`h-[15px] w-[15px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.7] transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 6 3.5 3.5L11.5 6" /></svg>
      </button>

      {isOpen ? (
        <div id={menuId} className="absolute top-[calc(100%+12px)] right-0 z-80 w-[min(300px,calc(100vw-32px))] overflow-hidden rounded-[7px] border border-[#d4d8e1] bg-white shadow-[0_18px_42px_rgb(25_35_52_/_18%)]" role="menu" aria-label="Profile menu">
          <div className="h-1 bg-[#073d78]" aria-hidden="true" />
          <header className="grid grid-cols-[50px_minmax(0,1fr)] items-center gap-[13px] px-[18px] pt-5 pb-3.5">
            <div className="grid h-[50px] w-[50px] place-items-center rounded-full bg-[#172034] text-[0.86rem] font-extrabold text-white" aria-hidden="true">{initials}</div>
            <div className="grid min-w-0 gap-1"><strong className="truncate whitespace-nowrap text-[0.9rem] text-[#20243a]">{displayName}</strong><span className="truncate whitespace-nowrap text-[0.72rem] text-[#747b8d]">{email}</span></div>
          </header>
          <div className="mr-[18px] mb-[17px] ml-[81px] flex items-center gap-[7px] text-[0.7rem] tracking-[0.05em] text-[#536073] uppercase"><span className="h-[7px] w-[7px] rounded-full bg-[#2a8864] shadow-[0_0_0_3px_#e5f4ed]" />{roleLabel}</div>
          <div className="h-px bg-[#e2e4ea]" aria-hidden="true" />
          <button
            className="grid min-h-[68px] w-full cursor-pointer grid-cols-[24px_minmax(0,1fr)] items-center gap-[13px] border-0 bg-white px-[18px] py-[13px] text-left text-[#8d3039] hover:bg-[#fff3f4] focus-visible:bg-[#fff3f4] focus-visible:outline-3 focus-visible:-outline-offset-4 focus-visible:outline-[#c45761]"
            type="button"
            role="menuitem"
            onClick={onSignOut}
          >
            <svg className="h-[23px] w-[23px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.7]" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" />
            </svg>
            <span className="grid gap-[3px]"><strong className="text-[0.84rem]">{logoutLabel}</strong><small className="text-[0.68rem] text-[#8b7377]">{logoutHint}</small></span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
