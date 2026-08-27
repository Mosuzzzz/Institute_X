"use client";

import type { ReactNode } from "react";
import type { SignedViewUrlDto } from "../lib/backend-api";
import { useBackendQuery } from "../lib/use-backend-query";

export default function CourseCoverImage({
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
    assetId ? `course-covers/${assetId}/view-url` : null,
  );

  if (!data?.url) return <>{fallback}</>;

  // Signed object-storage URLs can come from institute-managed S3 or local MinIO.
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} className={className} src={data.url} />;
}
