CREATE TYPE "CourseEligibilityMode" AS ENUM ('OPEN', 'LIMITED');

ALTER TABLE "courses"
ADD COLUMN "eligibility_mode" "CourseEligibilityMode" NOT NULL DEFAULT 'LIMITED';
