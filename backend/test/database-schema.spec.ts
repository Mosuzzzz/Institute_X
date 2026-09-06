import { Prisma } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('database schema contract', () => {
  const modelNames = Prisma.dmmf.datamodel.models.map((model) => model.name);

  it.each([
    'Major',
    'User',
    'TeacherPermissionRequest',
    'Course',
    'Category',
    'CourseCategory',
    'CourseAllowedMajor',
    'CourseVersion',
    'CourseVersionReview',
    'DiscardedCourseVersionReview',
    'CourseSection',
    'ContentItem',
    'MediaAsset',
    'CourseCoverAsset',
    'Quiz',
    'Question',
    'QuestionImageAsset',
    'QuestionOption',
    'CourseEnrollment',
    'QuizAttempt',
    'QuizAttemptQuestion',
    'QuizAttemptOption',
    'QuizAttemptAnswer',
    'CourseAccessEvent',
  ])('defines the %s model', (modelName) => {
    expect(modelNames).toContain(modelName);
  });

  it('stores one private image asset per assessment question', () => {
    const question = Prisma.dmmf.datamodel.models.find((model) => model.name === 'Question');
    const migration = readFileSync(
      resolve(
        __dirname,
        '../prisma/migrations/202608270003_add_question_image_assets/migration.sql',
      ),
      'utf8',
    );

    expect(question?.fields.map((field) => field.name)).toContain('imageAsset');
    expect(migration).toContain('CREATE TABLE "public"."question_image_assets"');
    expect(migration).toContain('UNIQUE ("question_id")');
    expect(migration).toContain('ON DELETE CASCADE');
  });

  it('defines exactly the four mutually exclusive user roles from the SRS', () => {
    const userRole = Prisma.dmmf.datamodel.enums.find((item) => item.name === 'UserRole');

    expect(userRole?.values.map((item) => item.name)).toEqual([
      'STUDENT',
      'TEACHER',
      'APPROVER',
      'OWNER',
    ]);
  });

  it('stores major-only eligibility without education or year fields', () => {
    const eligibility = Prisma.dmmf.datamodel.models.find(
      (model) => model.name === 'CourseAllowedMajor',
    );

    expect(eligibility?.fields.map((field) => field.name)).toEqual(
      expect.arrayContaining(['courseId', 'majorId']),
    );
    expect(eligibility?.fields.map((field) => field.name)).not.toEqual(
      expect.arrayContaining(['educationLevel', 'yearLevel']),
    );
  });

  it('stores the primary language on every Course Version', () => {
    const version = Prisma.dmmf.datamodel.models.find((model) => model.name === 'CourseVersion');
    const migration = readFileSync(
      resolve(__dirname, '../prisma/migrations/202608280001_add_course_language/migration.sql'),
      'utf8',
    );

    expect(version?.fields.map((field) => field.name)).toContain('languageCode');
    expect(migration).toContain('"language_code" VARCHAR(10) NOT NULL DEFAULT \'th\'');
  });

  it('stores ordered Sections containing Course lectures', () => {
    const section = Prisma.dmmf.datamodel.models.find((model) => model.name === 'CourseSection');
    const content = Prisma.dmmf.datamodel.models.find((model) => model.name === 'ContentItem');

    expect(section?.fields.map((field) => field.name)).toEqual(
      expect.arrayContaining(['versionId', 'title', 'position', 'contentItems']),
    );
    expect(content?.fields.map((field) => field.name)).toContain('sectionId');
  });

  it('removes the fixed-ID development mock Courses and their dependent activity', () => {
    const migration = readFileSync(
      resolve(__dirname, '../prisma/migrations/202608310001_remove_mock_courses/migration.sql'),
      'utf8',
    );

    expect(migration).toContain('30000000-0000-4000-8000-%');
    expect(migration).toContain('DELETE FROM "public"."quiz_attempts"');
    expect(migration).toContain('DELETE FROM "public"."course_enrollments"');
    expect(migration).toContain('DELETE FROM "public"."course_access_events"');
    expect(migration).toContain('DELETE FROM "public"."courses"');
    expect(migration.indexOf('DELETE FROM "public"."quiz_attempts"')).toBeLessThan(
      migration.indexOf('DELETE FROM "public"."courses"'),
    );
  });

  it('migrates legacy approved Versions into the automatic publication workflow', () => {
    const migration = readFileSync(
      resolve(
        __dirname,
        '../prisma/migrations/202609030001_auto_publish_approved_versions/migration.sql',
      ),
      'utf8',
    );

    expect(migration).toContain('WHERE "status" = \'APPROVED\'');
    expect(migration).toContain('SET "status" = \'SUPERSEDED\'');
    expect(migration).toContain('SET "status" = \'PUBLISHED\'');
    expect(migration.indexOf('SET "status" = \'SUPERSEDED\'')).toBeLessThan(
      migration.lastIndexOf('SET "status" = \'PUBLISHED\''),
    );
  });

  it('stores the institutional username separately from the display name', () => {
    const user = Prisma.dmmf.datamodel.models.find((model) => model.name === 'User');

    expect(user?.fields.map((field) => field.name)).toEqual(
      expect.arrayContaining(['username', 'fullName']),
    );
  });

  it('persists quiz timing, randomized order, answers, and enrollments', () => {
    const quiz = Prisma.dmmf.datamodel.models.find((model) => model.name === 'Quiz');

    expect(quiz?.fields.map((field) => field.name)).toEqual(
      expect.arrayContaining(['durationSeconds', 'randomizeQuestions', 'randomizeOptions']),
    );
    expect(modelNames).toEqual(
      expect.arrayContaining([
        'CourseEnrollment',
        'QuizAttemptQuestion',
        'QuizAttemptOption',
        'QuizAttemptAnswer',
      ]),
    );
  });

  it('enforces singleton workflow states with PostgreSQL partial unique indexes', () => {
    const migration = readFileSync(
      resolve(__dirname, '../prisma/migrations/202608250002_workflow_invariants/migration.sql'),
      'utf8',
    );

    expect(migration).toContain('teacher_permission_requests_one_pending_per_teacher');
    expect(migration).toContain("WHERE status = 'PENDING'");
    expect(migration).toContain('course_versions_one_active_revision_per_course');
    expect(migration).toContain("WHERE status IN ('DRAFT', 'SUBMITTED', 'REJECTED')");
    expect(migration).toContain('course_versions_one_published_per_course');
    expect(migration).toContain("WHERE status = 'PUBLISHED'");
  });

  it('serializes child authoring mutations through the Draft Version row', () => {
    const migration = readFileSync(
      resolve(__dirname, '../prisma/migrations/202609060001_lock_draft_authoring/migration.sql'),
      'utf8',
    );

    expect(migration).toContain('FOR UPDATE');
    expect(migration).toContain("target_status <> 'DRAFT'");
    expect(migration).toContain('media_assets_require_draft');
    expect(migration).toContain('question_image_assets_require_draft');
  });

  it('preserves review audit records when a reopened Draft is discarded', () => {
    const migration = readFileSync(
      resolve(
        __dirname,
        '../prisma/migrations/202609060002_preserve_discarded_review_history/migration.sql',
      ),
      'utf8',
    );

    expect(modelNames).toContain('DiscardedCourseVersionReview');
    expect(migration).toContain('discarded_course_version_reviews');
    expect(migration).toContain('original_review_id');
  });

  it('seeds the Mock SSO Computer Science Major idempotently', () => {
    const migration = readFileSync(
      resolve(__dirname, '../prisma/migrations/202608250003_seed_cs_major/migration.sql'),
      'utf8',
    );

    expect(migration).toContain("'CS'");
    expect(migration).toContain('ON CONFLICT ("major_code")');
  });

  it('backfills usernames safely for existing SSO users', () => {
    const migration = readFileSync(
      resolve(__dirname, '../prisma/migrations/202608250004_add_user_username/migration.sql'),
      'utf8',
    );

    expect(migration).toContain('SET "username" = "sso_subject"');
    expect(migration).toContain('SET NOT NULL');
    expect(migration).toContain('CREATE UNIQUE INDEX');
  });

  it('creates category taxonomy and backfills existing Courses', () => {
    const migration = readFileSync(
      resolve(__dirname, '../prisma/migrations/202608260001_add_course_categories/migration.sql'),
      'utf8',
    );

    expect(migration).toContain('CREATE TABLE "public"."categories"');
    expect(migration).toContain('CREATE TABLE "public"."course_categories"');
    expect(migration).toContain("'uncategorized'");
    expect(migration).toContain('INSERT INTO "public"."course_categories"');
  });

  it('seeds all vocational education level and field combinations idempotently', () => {
    const migration = readFileSync(
      resolve(__dirname, '../prisma/migrations/202608260002_seed_vocational_majors/migration.sql'),
      'utf8',
    );

    expect(migration.match(/\('00000000-0000-4000-8000-000000000\d{3}'/g)).toHaveLength(27);
    expect(migration).toContain("'VOC-ICT'");
    expect(migration).toContain("'HVC-ICT'");
    expect(migration).toContain("'BTECH-ICT'");
    expect(migration).toContain('ประกาศนียบัตรวิชาชีพ (ปวช.)');
    expect(migration).toContain('ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)');
    expect(migration).toContain('ปริญญาตรีสายเทคโนโลยีหรือสายปฏิบัติการ (ทล.บ.)');
    expect(migration).toContain('ON CONFLICT ("major_code") DO NOTHING');
  });

  it('reassigns legacy CS students before removing the CS Major', () => {
    const migration = readFileSync(
      resolve(__dirname, '../prisma/migrations/202608260003_remove_cs_major/migration.sql'),
      'utf8',
    );

    expect(migration).toContain('UPDATE "public"."users"');
    expect(migration).toContain('WHERE legacy_major."major_code" = \'CS\'');
    expect(migration).toContain('replacement_major."major_code" = \'BTECH-ICT\'');
    expect(migration).toContain('DELETE FROM "public"."majors"');
    expect(migration).toContain('WHERE "major_code" = \'CS\'');
    expect(migration.indexOf('UPDATE "public"."users"')).toBeLessThan(
      migration.indexOf('DELETE FROM "public"."majors"'),
    );
  });

  it('seeds the initial Thai Course categories idempotently', () => {
    const migration = readFileSync(
      resolve(__dirname, '../prisma/migrations/202608260004_seed_categories/migration.sql'),
      'utf8',
    );

    expect(migration).toContain("'mathematics', 'คณิตศาสตร์'");
    expect(migration).toContain("'japanese', 'ภาษาญี่ปุ่น'");
    expect(migration).toContain("'technology', 'เทคโนโลยี'");
    expect(migration).toContain('ON CONFLICT ("slug")');
  });

  it('seeds the expanded Thai Course catalog categories idempotently', () => {
    const migration = readFileSync(
      resolve(
        __dirname,
        '../prisma/migrations/202608260005_seed_expanded_categories/migration.sql',
      ),
      'utf8',
    );

    expect(migration.match(/CURRENT_TIMESTAMP, CURRENT_TIMESTAMP\)/g)).toHaveLength(12);
    expect(migration).toContain("'science', 'วิทยาศาสตร์'");
    expect(migration).toContain("'english', 'ภาษาอังกฤษ'");
    expect(migration).toContain("'business-accounting', 'ธุรกิจและการบัญชี'");
    expect(migration).toContain("'industry-engineering', 'อุตสาหกรรมและวิศวกรรม'");
    expect(migration).toContain("'tourism-hospitality', 'การท่องเที่ยวและการบริการ'");
    expect(migration).toContain('ON CONFLICT ("slug") DO NOTHING');
  });

  it('removes the legacy Uncategorized Course category safely', () => {
    const migration = readFileSync(
      resolve(
        __dirname,
        '../prisma/migrations/202608260006_remove_uncategorized_category/migration.sql',
      ),
      'utf8',
    );

    expect(migration).toContain('DELETE FROM "public"."course_categories"');
    expect(migration).toContain('DELETE FROM "public"."categories"');
    expect(migration).toContain('WHERE "slug" = \'uncategorized\'');
  });

  it('normalizes Category and Major canonical names to English', () => {
    const migration = readFileSync(
      resolve(__dirname, '../prisma/migrations/202608260007_english_reference_names/migration.sql'),
      'utf8',
    );

    expect(migration).toContain("WHEN 'mathematics' THEN 'Mathematics'");
    expect(migration).toContain("WHEN 'japanese' THEN 'Japanese'");
    expect(migration).toContain("WHEN 'technology' THEN 'Technology'");
    expect(migration).toContain(
      "WHEN 'VOC-ICT' THEN 'Vocational Certificate (Voc. Cert.) — Information and Communication Technology'",
    );
    expect(migration).toContain(
      "WHEN 'HVC-ICT' THEN 'Higher Vocational Certificate (High Voc. Cert.) — Information and Communication Technology'",
    );
    expect(migration).toContain(
      "WHEN 'BTECH-ICT' THEN 'Bachelor of Technology (B.Tech.) — Information and Communication Technology'",
    );
    expect(migration).toContain('UPDATE "public"."categories"');
    expect(migration).toContain('UPDATE "public"."majors"');
  });
});
