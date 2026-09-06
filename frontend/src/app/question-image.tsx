"use client";

import { useEffect, type ReactNode } from "react";
import type { SignedViewUrlDto } from "../lib/backend-api";
import { useBackendQuery } from "../lib/use-backend-query";

export default function QuestionImage({
  assetId,
  alt,
  className,
  fallback,
}: {
  assetId?: string | null;
  alt: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const { data, refresh } = useBackendQuery<SignedViewUrlDto>(
    assetId ? `question-images/${assetId}/view-url` : null,
  );

  useEffect(() => {
    if (!data?.expiresAt) return;
    const delay = Math.max(0, Date.parse(data.expiresAt) - Date.now() - 1_000);
    const timer = window.setTimeout(() => void refresh(), delay);
    return () => window.clearTimeout(timer);
  }, [data?.expiresAt, refresh]);

  if (!data?.url) return <>{fallback}</>;

  // The source is a short-lived URL from private object storage.
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} className={className} src={data.url} />;
}
