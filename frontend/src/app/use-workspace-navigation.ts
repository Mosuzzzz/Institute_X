'use client';

import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';

export default function useWorkspaceNavigation(open: boolean, setOpen: Dispatch<SetStateAction<boolean>>) {
  const sidebarRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const breakpoint = window.matchMedia('(max-width: 820px)');
    const closeOnDesktop = () => { if (!breakpoint.matches) setOpen(false); };
    breakpoint.addEventListener('change', closeOnDesktop);
    return () => breakpoint.removeEventListener('change', closeOnDesktop);
  }, [setOpen]);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar || !open || !window.matchMedia('(max-width: 820px)').matches) return;
    const workspace = sidebar.nextElementSibling as HTMLElement | null;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    const previousInert = workspace?.inert ?? false;
    document.body.style.overflow = 'hidden';
    if (workspace) workspace.inert = true;
    const focusable = () => Array.from(sidebar.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), [tabindex="0"]')).filter(element => element.getClientRects().length > 0);
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      if (workspace) workspace.inert = previousInert;
      document.removeEventListener('keydown', onKeyDown);
      trigger?.focus();
    };
  }, [open, setOpen]);

  return { sidebarRef, triggerRef };
}
