CREATE TABLE "lesson_completions" (
  "student_id" UUID NOT NULL,
  "content_item_id" UUID NOT NULL,
  "completed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lesson_completions_pkey" PRIMARY KEY ("student_id", "content_item_id"),
  CONSTRAINT "lesson_completions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "lesson_completions_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "content_items"("content_item_id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "lesson_completions_content_item_id_idx" ON "lesson_completions"("content_item_id");
