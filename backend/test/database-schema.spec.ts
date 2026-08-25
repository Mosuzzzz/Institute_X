import { Prisma } from '@prisma/client';

describe('database schema contract', () => {
  const modelNames = Prisma.dmmf.datamodel.models.map((model) => model.name);

  it.each([
    'Major',
    'User',
    'TeacherPermissionRequest',
    'Course',
    'CourseAllowedMajor',
    'CourseVersion',
    'CourseVersionReview',
    'ContentItem',
    'MediaAsset',
    'Quiz',
    'Question',
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
});
