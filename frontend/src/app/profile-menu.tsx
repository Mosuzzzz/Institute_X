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
    <div className="profile-menu" ref={menuRef}>
      <button
        ref={triggerRef}
        className="profile-trigger"
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
        <span>{initials}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 6 3.5 3.5L11.5 6" /></svg>
      </button>

      {isOpen ? (
        <div id={menuId} className="profile-popover" role="menu" aria-label="Profile menu">
          <div className="profile-popover-accent" aria-hidden="true" />
          <header>
            <div className="profile-large-avatar" aria-hidden="true">{initials}</div>
            <div><strong>{displayName}</strong><span>{email}</span></div>
          </header>
          <div className="profile-role"><span />{roleLabel}</div>
          <div className="profile-menu-rule" aria-hidden="true" />
          <button
            className="profile-logout"
            type="button"
            role="menuitem"
            onClick={onSignOut}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" />
            </svg>
            <span><strong>{logoutLabel}</strong><small>{logoutHint}</small></span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
