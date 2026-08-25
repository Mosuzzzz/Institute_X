-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('STUDENT', 'TEACHER', 'APPROVER', 'OWNER');

-- CreateEnum
CREATE TYPE "public"."AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."TeacherPermissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "public"."CourseVersionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REJECTED', 'PUBLISHED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "public"."ContentType" AS ENUM ('TEXT', 'VIDEO', 'AUDIO', 'IMAGE', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "public"."AssetStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."QuizType" AS ENUM ('PRE_TEST', 'POST_TEST');

-- CreateEnum
CREATE TYPE "public"."QuestionType" AS ENUM ('MULTIPLE_CHOICE');

-- CreateEnum
CREATE TYPE "public"."QuizResult" AS ENUM ('COMPLETED', 'PASS', 'NOT_PASS');

-- CreateEnum
CREATE TYPE "public"."ReviewDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."majors" (
    "major_id" UUID NOT NULL,
    "major_code" VARCHAR(50) NOT NULL,
    "major_name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "majors_pkey" PRIMARY KEY ("major_id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "user_id" UUID NOT NULL,
    "sso_subject" VARCHAR(255) NOT NULL,
    "university_email" VARCHAR(320) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "account_status" "public"."AccountStatus" NOT NULL,
    "major_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."teacher_permission_requests" (
    "request_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "status" "public"."TeacherPermissionStatus" NOT NULL DEFAULT 'PENDING',
    "request_message" TEXT,
    "reviewed_by" UUID,
    "review_comment" TEXT,
    "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ,

    CONSTRAINT "teacher_permission_requests_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "public"."courses" (
    "course_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMPTZ,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("course_id")
);

-- CreateTable
CREATE TABLE "public"."course_allowed_majors" (
    "course_id" UUID NOT NULL,
    "major_id" UUID NOT NULL,

    CONSTRAINT "course_allowed_majors_pkey" PRIMARY KEY ("course_id","major_id")
);

-- CreateTable
CREATE TABLE "public"."course_versions" (
    "version_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "public"."CourseVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMPTZ,
    "published_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "course_versions_pkey" PRIMARY KEY ("version_id")
);

-- CreateTable
CREATE TABLE "public"."course_version_reviews" (
    "review_id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "submission_number" INTEGER NOT NULL,
    "submitted_at" TIMESTAMPTZ NOT NULL,
    "reviewed_by" UUID,
    "decision" "public"."ReviewDecision",
    "review_comment" TEXT,
    "reviewed_at" TIMESTAMPTZ,

    CONSTRAINT "course_version_reviews_pkey" PRIMARY KEY ("review_id")
);

-- CreateTable
CREATE TABLE "public"."content_items" (
    "content_item_id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "content_type" "public"."ContentType" NOT NULL,
    "title" VARCHAR(255),
    "text_body" TEXT,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "content_items_pkey" PRIMARY KEY ("content_item_id")
);

-- CreateTable
CREATE TABLE "public"."media_assets" (
    "asset_id" UUID NOT NULL,
    "content_item_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(255) NOT NULL,
    "storage_key" VARCHAR(1024) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "status" "public"."AssetStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("asset_id")
);

-- CreateTable
CREATE TABLE "public"."quizzes" (
    "quiz_id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "quiz_type" "public"."QuizType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "duration_seconds" INTEGER,
    "randomize_questions" BOOLEAN NOT NULL DEFAULT true,
    "randomize_options" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("quiz_id")
);

-- CreateTable
CREATE TABLE "public"."questions" (
    "question_id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" "public"."QuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "points" DECIMAL(10,2) NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("question_id")
);

-- CreateTable
CREATE TABLE "public"."question_options" (
    "option_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "option_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("option_id")
);

-- CreateTable
CREATE TABLE "public"."course_enrollments" (
    "enrollment_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "enrolled_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("enrollment_id")
);

-- CreateTable
CREATE TABLE "public"."quiz_attempts" (
    "attempt_id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "score" DECIMAL(5,2),
    "result" "public"."QuizResult",
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "submitted_at" TIMESTAMPTZ,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("attempt_id")
);

-- CreateTable
CREATE TABLE "public"."quiz_attempt_questions" (
    "attempt_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "display_position" INTEGER NOT NULL,

    CONSTRAINT "quiz_attempt_questions_pkey" PRIMARY KEY ("attempt_id","question_id")
);

-- CreateTable
CREATE TABLE "public"."quiz_attempt_options" (
    "attempt_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "option_id" UUID NOT NULL,
    "display_position" INTEGER NOT NULL,

    CONSTRAINT "quiz_attempt_options_pkey" PRIMARY KEY ("attempt_id","question_id","option_id")
);

-- CreateTable
CREATE TABLE "public"."quiz_attempt_answers" (
    "attempt_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "selected_option_id" UUID NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "points_awarded" DECIMAL(10,2) NOT NULL,
    "answered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempt_answers_pkey" PRIMARY KEY ("attempt_id","question_id")
);

-- CreateTable
CREATE TABLE "public"."course_access_events" (
    "event_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "accessed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_access_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "majors_major_code_key" ON "public"."majors"("major_code");

-- CreateIndex
CREATE UNIQUE INDEX "majors_major_name_key" ON "public"."majors"("major_name");

-- CreateIndex
CREATE UNIQUE INDEX "users_sso_subject_key" ON "public"."users"("sso_subject");

-- CreateIndex
CREATE UNIQUE INDEX "users_university_email_key" ON "public"."users"("university_email");

-- CreateIndex
CREATE INDEX "teacher_permission_requests_teacher_id_status_idx" ON "public"."teacher_permission_requests"("teacher_id", "status");

-- CreateIndex
CREATE INDEX "courses_teacher_id_idx" ON "public"."courses"("teacher_id");

-- CreateIndex
CREATE INDEX "course_versions_course_id_status_idx" ON "public"."course_versions"("course_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "course_versions_course_id_version_number_key" ON "public"."course_versions"("course_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "course_version_reviews_version_id_submission_number_key" ON "public"."course_version_reviews"("version_id", "submission_number");

-- CreateIndex
CREATE UNIQUE INDEX "content_items_version_id_position_key" ON "public"."content_items"("version_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_content_item_id_key" ON "public"."media_assets"("content_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_storage_key_key" ON "public"."media_assets"("storage_key");

-- CreateIndex
CREATE UNIQUE INDEX "quizzes_version_id_quiz_type_key" ON "public"."quizzes"("version_id", "quiz_type");

-- CreateIndex
CREATE UNIQUE INDEX "questions_quiz_id_position_key" ON "public"."questions"("quiz_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "question_options_question_id_position_key" ON "public"."question_options"("question_id", "position");

-- CreateIndex
CREATE INDEX "course_enrollments_student_id_enrolled_at_idx" ON "public"."course_enrollments"("student_id", "enrolled_at");

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollments_course_id_student_id_key" ON "public"."course_enrollments"("course_id", "student_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_quiz_id_student_id_submitted_at_idx" ON "public"."quiz_attempts"("quiz_id", "student_id", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_attempt_questions_attempt_id_display_position_key" ON "public"."quiz_attempt_questions"("attempt_id", "display_position");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_attempt_options_attempt_id_question_id_display_positio_key" ON "public"."quiz_attempt_options"("attempt_id", "question_id", "display_position");

-- CreateIndex
CREATE INDEX "course_access_events_course_id_accessed_at_idx" ON "public"."course_access_events"("course_id", "accessed_at");

-- CreateIndex
CREATE INDEX "course_access_events_student_id_accessed_at_idx" ON "public"."course_access_events"("student_id", "accessed_at");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "public"."majors"("major_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teacher_permission_requests" ADD CONSTRAINT "teacher_permission_requests_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teacher_permission_requests" ADD CONSTRAINT "teacher_permission_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_allowed_majors" ADD CONSTRAINT "course_allowed_majors_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("course_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_allowed_majors" ADD CONSTRAINT "course_allowed_majors_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "public"."majors"("major_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_versions" ADD CONSTRAINT "course_versions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("course_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_version_reviews" ADD CONSTRAINT "course_version_reviews_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "public"."course_versions"("version_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_version_reviews" ADD CONSTRAINT "course_version_reviews_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."content_items" ADD CONSTRAINT "content_items_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "public"."course_versions"("version_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."media_assets" ADD CONSTRAINT "media_assets_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("content_item_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quizzes" ADD CONSTRAINT "quizzes_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "public"."course_versions"("version_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."questions" ADD CONSTRAINT "questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("quiz_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."question_options" ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("question_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("course_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_enrollments" ADD CONSTRAINT "course_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("quiz_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_attempts" ADD CONSTRAINT "quiz_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_attempt_questions" ADD CONSTRAINT "quiz_attempt_questions_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."quiz_attempts"("attempt_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_attempt_questions" ADD CONSTRAINT "quiz_attempt_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_attempt_options" ADD CONSTRAINT "quiz_attempt_options_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."quiz_attempts"("attempt_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_attempt_options" ADD CONSTRAINT "quiz_attempt_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_attempt_options" ADD CONSTRAINT "quiz_attempt_options_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "public"."question_options"("option_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_attempt_answers" ADD CONSTRAINT "quiz_attempt_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."quiz_attempts"("attempt_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_attempt_answers" ADD CONSTRAINT "quiz_attempt_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_attempt_answers" ADD CONSTRAINT "quiz_attempt_answers_selected_option_id_fkey" FOREIGN KEY ("selected_option_id") REFERENCES "public"."question_options"("option_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_access_events" ADD CONSTRAINT "course_access_events_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_access_events" ADD CONSTRAINT "course_access_events_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("course_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain checks that Prisma cannot express in schema.prisma
ALTER TABLE "public"."users"
  ADD CONSTRAINT "student_major_required" CHECK ("role" <> 'STUDENT' OR "major_id" IS NOT NULL);

ALTER TABLE "public"."course_versions"
  ADD CONSTRAINT "course_version_number_positive" CHECK ("version_number" > 0);

ALTER TABLE "public"."course_version_reviews"
  ADD CONSTRAINT "submission_number_positive" CHECK ("submission_number" > 0);

ALTER TABLE "public"."content_items"
  ADD CONSTRAINT "content_position_positive" CHECK ("position" > 0),
  ADD CONSTRAINT "content_body_matches_type" CHECK (
    ("content_type" = 'TEXT' AND "text_body" IS NOT NULL)
    OR ("content_type" <> 'TEXT' AND "text_body" IS NULL)
  );

ALTER TABLE "public"."media_assets"
  ADD CONSTRAINT "media_size_valid" CHECK ("size_bytes" BETWEEN 1 AND 1073741824);

ALTER TABLE "public"."quizzes"
  ADD CONSTRAINT "quiz_duration_positive" CHECK ("duration_seconds" IS NULL OR "duration_seconds" > 0);

ALTER TABLE "public"."questions"
  ADD CONSTRAINT "question_points_positive" CHECK ("points" > 0),
  ADD CONSTRAINT "question_position_positive" CHECK ("position" > 0);

ALTER TABLE "public"."question_options"
  ADD CONSTRAINT "option_position_positive" CHECK ("position" > 0);

ALTER TABLE "public"."quiz_attempts"
  ADD CONSTRAINT "attempt_score_percentage" CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 100);

ALTER TABLE "public"."quiz_attempt_questions"
  ADD CONSTRAINT "attempt_question_position_positive" CHECK ("display_position" > 0);

ALTER TABLE "public"."quiz_attempt_options"
  ADD CONSTRAINT "attempt_option_position_positive" CHECK ("display_position" > 0);

ALTER TABLE "public"."quiz_attempt_answers"
  ADD CONSTRAINT "points_awarded_nonnegative" CHECK ("points_awarded" >= 0);

CREATE UNIQUE INDEX "one_pending_teacher_permission"
  ON "public"."teacher_permission_requests" ("teacher_id")
  WHERE "status" = 'PENDING';

CREATE UNIQUE INDEX "one_published_version_per_course"
  ON "public"."course_versions" ("course_id")
  WHERE "status" = 'PUBLISHED';
