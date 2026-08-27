CREATE TABLE "public"."course_cover_assets" (
    "asset_id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(255) NOT NULL,
    "storage_key" VARCHAR(1024) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "status" "public"."AssetStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_cover_assets_pkey" PRIMARY KEY ("asset_id")
);

CREATE UNIQUE INDEX "course_cover_assets_version_id_key"
ON "public"."course_cover_assets"("version_id");

CREATE UNIQUE INDEX "course_cover_assets_storage_key_key"
ON "public"."course_cover_assets"("storage_key");

ALTER TABLE "public"."course_cover_assets"
ADD CONSTRAINT "course_cover_assets_version_id_fkey"
FOREIGN KEY ("version_id") REFERENCES "public"."course_versions"("version_id")
ON DELETE CASCADE ON UPDATE CASCADE;
