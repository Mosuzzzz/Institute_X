"use client";

import { useEffect, useState } from "react";
import { useUiTranslation } from "../lib/ui-translations";
import PopupAlert from "./popup-alert";

export default function QuestionImagePicker({ name, className, upload }: {
  name: string;
  className?: string;
  upload?: (file: File) => Promise<void>;
}) {
  const t = useUiTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function save(selected: File) {
    if (!upload) return;
    setBusy(true);
    setError(null);
    try {
      await upload(selected);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save this change.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      <PopupAlert message={error ? t(error) : null} />
      <input
        aria-label={t("Question image (optional)")}
        aria-invalid={Boolean(error)}
        accept="image/jpeg,image/png,image/webp"
        className={`${className ?? ""} ${error ? "border-red-500 bg-red-50/40 text-red-700" : ""}`}
        name={name}
        disabled={busy}
        type="file"
        onChange={(event) => {
          const selected = event.currentTarget.files?.[0] ?? null;
          setError(null);
          if (selected && (!["image/jpeg", "image/png", "image/webp"].includes(selected.type) || selected.size > 10 * 1024 * 1024)) {
            event.currentTarget.value = "";
            setFile(null);
            setPreview(null);
            setError("JPEG, PNG, or WebP · maximum 10 MB");
            return;
          }
          setFile(selected);
          setPreview(selected ? URL.createObjectURL(selected) : null);
          if (selected) void save(selected);
        }}
      />
      {preview ? (
        // The preview uses a local object URL while the image uploads.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={file?.name ?? ""} className="max-h-56 w-full max-w-md border border-[#d8dde5] bg-white object-contain" />
      ) : null}
      <div role={error ? "alert" : "status"} aria-live="polite" className={`text-xs font-normal ${error ? "font-medium text-red-700" : "text-[#58677c]"}`}>
        {busy ? t("Uploading…") : error ? t(error) : preview && !upload ? t("Image will be saved when you add the question.") : null}
        {error && file && upload ? (
          <button type="button" className="ml-2 font-semibold text-[#073d78] underline" onClick={() => void save(file)}>{t("Retry")}</button>
        ) : null}
      </div>
    </div>
  );
}
