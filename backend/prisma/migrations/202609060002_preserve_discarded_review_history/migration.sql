CREATE TABLE "discarded_course_version_reviews" (
  "discarded_review_id" UUID NOT NULL,
  "original_review_id" UUID NOT NULL,
  "original_version_id" UUID NOT NULL,
  "course_id" UUID NOT NULL,
  "version_number" INTEGER NOT NULL,
  "submission_number" INTEGER NOT NULL,
  "submitted_at" TIMESTAMPTZ NOT NULL,
  "reviewed_by" UUID,
  "decision" "ReviewDecision",
  "review_comment" TEXT,
  "reviewed_at" TIMESTAMPTZ,
  "discarded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "discarded_course_version_reviews_pkey" PRIMARY KEY ("discarded_review_id")
);

CREATE UNIQUE INDEX "discarded_course_version_reviews_original_review_id_key"
ON "discarded_course_version_reviews"("original_review_id");

CREATE INDEX "discarded_course_version_reviews_course_id_version_number_idx"
ON "discarded_course_version_reviews"("course_id", "version_number");
