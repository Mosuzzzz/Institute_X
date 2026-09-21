"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BootstrapIcon from "./bootstrap-icon";
import { useUiTranslation } from "../lib/ui-translations";

export default function PopupAlert({ message }: { message: string | null | undefined }) {
  const t = useUiTranslation();
  const titleId = useId();
  const descriptionId = useId();
  const lastMessage = useRef<string | null>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!message || message === lastMessage.current) return;
    lastMessage.current = message;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [message]);

  useEffect(() => {
    if (!message) lastMessage.current = null;
  }, [message]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmButton.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  if (typeof document === "undefined" || !open || !message) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/55 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-panel bg-white shadow-[0_24px_72px_rgb(15_23_42_/_30%)]"
        role="alertdialog"
      >
        <div className="flex items-start gap-4 px-6 pt-6 sm:px-7 sm:pt-7">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-red-50 text-xl text-red-700" aria-hidden="true">
            <BootstrapIcon name="exclamation-lg" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-lg font-semibold text-slate-900" id={titleId}>{t("Alert")}</h2>
            <p className="mt-2 break-words text-sm leading-6 text-slate-600" id={descriptionId}>{message}</p>
          </div>
        </div>
        <footer className="mt-7 flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4 sm:px-7">
          <button
            className="inline-flex min-h-11 min-w-24 cursor-pointer items-center justify-center rounded-control bg-action px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-action-hover active:bg-action-active"
            onClick={() => setOpen(false)}
            ref={confirmButton}
            type="button"
          >
            {t("OK")}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
