-- CreateTable
CREATE TABLE "public"."categories" (
    "category_id" UUID NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "public"."course_categories" (
    "course_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,

    CONSTRAINT "course_categories_pkey" PRIMARY KEY ("course_id", "category_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "public"."categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "public"."categories"("name");

-- CreateIndex
CREATE INDEX "course_categories_category_id_idx" ON "public"."course_categories"("category_id");

-- Seed a safe fallback so existing Courses remain discoverable.
INSERT INTO "public"."categories" (
    "category_id",
    "slug",
    "name",
    "created_at",
    "updated_at"
)
VALUES (
    '00000000-0000-4000-8000-000000000001',
    'uncategorized',
    'Uncategorized',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

-- Backfill every existing Course into the fallback Category.
INSERT INTO "public"."course_categories" ("course_id", "category_id")
SELECT "course_id", '00000000-0000-4000-8000-000000000001'
FROM "public"."courses"
ON CONFLICT ("course_id", "category_id") DO NOTHING;

-- AddForeignKey
ALTER TABLE "public"."course_categories"
ADD CONSTRAINT "course_categories_course_id_fkey"
FOREIGN KEY ("course_id") REFERENCES "public"."courses"("course_id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_categories"
ADD CONSTRAINT "course_categories_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id")
ON DELETE RESTRICT ON UPDATE CASCADE;
