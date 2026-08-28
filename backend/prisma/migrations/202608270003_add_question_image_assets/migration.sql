CREATE TABLE "public"."question_image_assets" (
    "asset_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(255) NOT NULL,
    "storage_key" VARCHAR(1024) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "status" "public"."AssetStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_image_assets_pkey" PRIMARY KEY ("asset_id"),
    CONSTRAINT "question_image_assets_question_id_key" UNIQUE ("question_id"),
    CONSTRAINT "question_image_assets_storage_key_key" UNIQUE ("storage_key"),
    CONSTRAINT "question_image_assets_question_id_fkey"
      FOREIGN KEY ("question_id") REFERENCES "public"."questions"("question_id")
      ON DELETE CASCADE ON UPDATE CASCADE
);
