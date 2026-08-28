"use client";

import type { ReactNode } from "react";
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
  const { data } = useBackendQuery<SignedViewUrlDto>(
    assetId ? `question-images/${assetId}/view-url` : null,
  );

  if (!data?.url) return <>{fallback}</>;

  // The source is a short-lived URL from private object storage.
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} className={className} src={data.url} />;
}
