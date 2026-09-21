"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { useUiTranslation } from "../lib/ui-translations";
import PopupAlert from "./popup-alert";

export default function AutosaveForm({ children, className, save }: {
  children: ReactNode;
  className?: string;
  save: (values: FormData) => Promise<void>;
}) {
  const t = useUiTranslation();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef(Promise.resolve());
  const revision = useRef(0);
  const dirty = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState("Changes save automatically.");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function flush(form: HTMLFormElement) {
    if (timer.current) clearTimeout(timer.current);
    if (!dirty.current) return;
    if (!form.checkValidity()) {
      setStatus("Complete the required fields to save.");
      setError("Complete the required fields to save.");
      return;
    }
    dirty.current = false;
    const currentRevision = revision.current;
    const values = new FormData(form);
    setStatus("Saving…");
    setError(null);
    // Serialize snapshots so a slower request cannot overwrite newer edits.
    queue.current = queue.current.then(async () => {
      try {
        await save(values);
        if (revision.current === currentRevision) setStatus("Saved automatically.");
      } catch (cause) {
        if (revision.current === currentRevision) {
          dirty.current = true;
          setError(cause instanceof Error ? cause.message : "Unable to save this change.");
        }
      }
    });
  }

  return (
    <form
      ref={formRef}
      className={className}
      onChange={(event) => {
        dirty.current = true;
        revision.current += 1;
        setError(null);
        setStatus("Unsaved changes…");
        if (timer.current) clearTimeout(timer.current);
        const form = event.currentTarget;
        timer.current = setTimeout(() => flush(form), 700);
      }}
      onBlur={(event) => flush(event.currentTarget)}
      onSubmit={(event) => {
        event.preventDefault();
        flush(event.currentTarget);
      }}
    >
      <PopupAlert message={error ? t(error) : null} />
      {children}
      <div className="col-span-full text-xs text-[#58677c]" role="status" aria-live="polite">
        {error ? (
          <button type="button" className="font-semibold text-[#073d78] underline" onClick={() => {
            if (formRef.current) flush(formRef.current);
          }}>{t("Retry")}</button>
        ) : t(status)}
      </div>
    </form>
  );
}
