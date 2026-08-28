CREATE TABLE "public"."course_sections" (
  "section_id" UUID NOT NULL,
  "version_id" UUID NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "position" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "course_sections_pkey" PRIMARY KEY ("section_id"),
  CONSTRAINT "course_sections_version_id_fkey"
    FOREIGN KEY ("version_id") REFERENCES "public"."course_versions"("version_id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "course_sections_version_id_position_key"
ON "public"."course_sections"("version_id", "position");

ALTER TABLE "public"."content_items" ADD COLUMN "section_id" UUID;
CREATE INDEX "content_items_section_id_idx" ON "public"."content_items"("section_id");
ALTER TABLE "public"."content_items"
ADD CONSTRAINT "content_items_section_id_fkey"
FOREIGN KEY ("section_id") REFERENCES "public"."course_sections"("section_id")
ON DELETE CASCADE ON UPDATE CASCADE;
