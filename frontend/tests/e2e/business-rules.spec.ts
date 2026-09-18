import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { authenticate, readLatestOtp, requestOtp, uniqueStudentEmail } from './support/auth';

const origin = process.env.E2E_BASE_URL ?? 'http://localhost:3001';
const mutationHeaders = { origin, 'x-csrf-request': '1' };

type Version = { id: string; versionNumber: number; status: string; title: string; quizzes?: Quiz[] };
type Quiz = { id: string; quizType: 'PRE_TEST' | 'POST_TEST'; questions?: Question[] };
type Question = { id: string; options: Array<{ id: string; isCorrect?: boolean }> };
type Course = { id: string; versions: Version[] };

async function api<T>(request: APIRequestContext, method: string, path: string, data?: unknown): Promise<T> {
  const response = await request.fetch(`/api/backend/${path}`, {
    method,
    headers: method === 'GET' ? undefined : mutationHeaders,
    data,
  });
  expect(response.ok(), `${method} ${path}: ${await response.text()}`).toBeTruthy();
  return response.status() === 204 ? undefined as T : response.json() as Promise<T>;
}

async function login(browserPage: Page, email: string, role: 'STUDENT' | 'TEACHER' | 'APPROVER' | 'REGISTRAR' | 'EXECUTIVE') {
  const session = await authenticate(browserPage, email, role);
  expect(session.user.roles).toContain(role);
}

async function createDraft(page: Page, label: string): Promise<{ courseId: string; versionId: string; title: string }> {
  const categories = await api<Array<{ id: string }>>(page.request, 'GET', 'categories');
  expect(categories.length).toBeGreaterThan(0);
  const title = `QA E2E ${label} ${Date.now()}`;
  const course = await api<Course>(page.request, 'POST', 'courses', {
    title,
    description: 'Disposable Playwright business-rule course.',
    languageCode: 'en',
    eligibilityMode: 'OPEN',
    majorIds: [],
    categoryIds: [categories[0].id],
  });
  return { courseId: course.id, versionId: course.versions[0].id, title };
}

async function addText(page: Page, versionId: string, title = 'Controlled lesson') {
  return api<{ id: string }>(page.request, 'POST', `course-versions/${versionId}/content/text`, {
    title,
    textBody: 'Controlled content created by Playwright.',
    position: 1,
  });
}

async function addQuiz(page: Page, versionId: string, quizType: 'PRE_TEST' | 'POST_TEST', questionCount: number) {
  const quiz = await api<Quiz>(page.request, 'POST', `course-versions/${versionId}/quizzes`, {
    quizType,
    title: `${quizType} controlled assessment`,
    durationSeconds: 600,
  });
  const questions: Question[] = [];
  for (let position = 1; position <= questionCount; position += 1) {
    questions.push(await api<Question>(page.request, 'POST', `quizzes/${quiz.id}/questions`, {
      questionText: `${quizType} question ${position}`,
      points: 1,
      position,
      options: [
        { optionText: `Correct ${position}`, isCorrect: true, position: 1 },
        { optionText: `Incorrect ${position}`, isCorrect: false, position: 2 },
      ],
    }));
  }
  return { ...quiz, questions };
}

async function publish(page: Page, approverPage: Page, versionId: string) {
  await api<void>(page.request, 'POST', `course-versions/${versionId}/submit`);
  await api<void>(approverPage.request, 'PATCH', `course-versions/${versionId}/review`, {
    decision: 'APPROVED',
    comment: 'Approved by Playwright.',
  });
}

async function answerAttempt(
  page: Page,
  kind: 'pre' | 'post',
  attempt: { attemptId: string; questions: Question[] },
  authoredQuestions: Question[],
  correctCount: number,
) {
  return api<{ score: number; result: string; courseId?: string }>(
    page.request,
    'POST',
    `${kind}-test-attempts/${attempt.attemptId}/submit`,
    {
      answers: attempt.questions.map((question, index) => {
        const authored = authoredQuestions.find(item => item.id === question.id)!;
        const correctId = authored.options.find(option => option.isCorrect)!.id;
        return {
          questionId: question.id,
          optionId: index < correctCount
            ? correctId
            : question.options.find(option => option.id !== correctId)!.id,
        };
      }),
    },
  );
}

test('OTP expires naturally after five minutes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Natural expiry is exercised once.');
  test.setTimeout(330_000);
  const email = uniqueStudentEmail('business', 'otp-expiry');
  const challenge = await requestOtp(page.request, email);
  const otp = await readLatestOtp(page.request, email);
  const lifetime = Date.parse(challenge.expiresAt) - Date.now();
  expect(lifetime).toBeGreaterThan(295_000);
  expect(lifetime).toBeLessThanOrEqual(300_000);

  await new Promise(resolve => setTimeout(resolve, Math.max(0, lifetime + 1_000)));
  const expired = await page.request.post('/api/auth/otp/verify', {
    headers: mutationHeaders,
    data: { challengeId: challenge.challengeId, otp },
  });
  expect(expired.status()).toBe(401);
  await expect(expired.json()).resolves.toMatchObject({ message: expect.stringMatching(/expired|invalid/i) });
});

test.describe('authenticated business workflows', () => {
let teacher: Page;
let approver: Page;
let student: Page;
let executive: Page;

test.beforeAll(async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Disposable multi-role workflows run once.');
  teacher = await browser.newPage();
  approver = await browser.newPage();
  student = await browser.newPage();
  executive = await browser.newPage();
  await login(teacher, 'teacher@x.ac.th', 'TEACHER');
  await login(approver, 'approver@x.ac.th', 'APPROVER');
  await login(student, 'student@x.ac.th', 'STUDENT');
  await login(executive, 'executive@x.ac.th', 'EXECUTIVE');
});

test.afterAll(async () => {
  await Promise.all([teacher?.close(), approver?.close(), student?.close(), executive?.close()]);
});

test('Pre-Test is single-attempt; Post-Test is unlimited with an 80 percent threshold and history', async ({ browser: _browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Disposable multi-role workflow runs once.');

  const draft = await createDraft(teacher, 'Assessments');
  const lesson = await addText(teacher, draft.versionId);
  const pre = await addQuiz(teacher, draft.versionId, 'PRE_TEST', 1);
  const post = await addQuiz(teacher, draft.versionId, 'POST_TEST', 5);
  await publish(teacher, approver, draft.versionId);

  const entry = await api<{ preTestId: string; postTestId: string; contentUnlocked: boolean }>(student.request, 'POST', `courses/${draft.courseId}/enter`);
  expect(entry).toMatchObject({ preTestId: pre.id, postTestId: post.id, contentUnlocked: false });
  const locked = await student.request.get(`/api/backend/courses/${draft.courseId}/content`);
  expect(locked.status()).toBe(403);

  const preAttempt = await api<{ attemptId: string; questions: Question[] }>(student.request, 'POST', `pre-tests/${pre.id}/attempts`);
  await expect(answerAttempt(student, 'pre', preAttempt, pre.questions, 1)).resolves.toMatchObject({ score: 100, result: 'COMPLETED' });
  const secondPre = await student.request.post(`/api/backend/pre-tests/${pre.id}/attempts`, { headers: mutationHeaders });
  expect(secondPre.status()).toBe(409);
  await api<void>(student.request, 'POST', `courses/${draft.courseId}/content/${lesson.id}/complete`);

  const scores = [60, 80, 100];
  for (const score of scores) {
    const attempt = await api<{ attemptId: string; questions: Question[] }>(student.request, 'POST', `post-tests/${post.id}/attempts`);
    const result = await answerAttempt(student, 'post', attempt, post.questions, score / 20);
    expect(result).toMatchObject({ score, result: score >= 80 ? 'PASS' : 'NOT_PASS' });
  }
  const history = await api<Array<{ score: number; result: string }>>(student.request, 'GET', `post-tests/${post.id}/results`);
  expect(history.map(item => item.score)).toEqual(expect.arrayContaining(scores));
  expect(history).toHaveLength(3);

  await student.goto(`/student/assessments/post-test/${post.id}`);
  await expect(student.getByRole('table')).toContainText('80%');
  await expect(student.getByRole('table')).toContainText('100%');
});

test('course lifecycle rejects, reopens, approves, creates a revision, supersedes, and unpublishes', async ({ browser: _browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Disposable multi-role workflow runs once.');
  const draft = await createDraft(teacher, 'Lifecycle');
  await addText(teacher, draft.versionId);

  await api<void>(teacher.request, 'POST', `course-versions/${draft.versionId}/submit`);
  const emptyRejection = await approver.request.patch(`/api/backend/course-versions/${draft.versionId}/review`, {
    headers: mutationHeaders,
    data: { decision: 'REJECTED', comment: '' },
  });
  expect(emptyRejection.status()).toBe(422);
  await api<void>(approver.request, 'PATCH', `course-versions/${draft.versionId}/review`, { decision: 'REJECTED', comment: 'Add clarification.' });
  await api<void>(teacher.request, 'POST', `course-versions/${draft.versionId}/reopen`);
  await publish(teacher, approver, draft.versionId);

  let detail = await api<Course>(teacher.request, 'GET', `courses/${draft.courseId}`);
  expect(detail.versions.find(version => version.id === draft.versionId)?.status).toBe('PUBLISHED');
  const revision = await api<Version>(teacher.request, 'POST', `courses/${draft.courseId}/versions`);
  expect(revision).toMatchObject({ versionNumber: 2, status: 'DRAFT' });
  detail = await api<Course>(teacher.request, 'GET', `courses/${draft.courseId}`);
  expect(detail.versions.find(version => version.id === draft.versionId)?.status).toBe('PUBLISHED');
  await publish(teacher, approver, revision.id);
  detail = await api<Course>(teacher.request, 'GET', `courses/${draft.courseId}`);
  expect(detail.versions.find(version => version.id === draft.versionId)?.status).toBe('SUPERSEDED');
  expect(detail.versions.find(version => version.id === revision.id)?.status).toBe('PUBLISHED');
  await api<void>(teacher.request, 'POST', `course-versions/${revision.id}/unpublish`);
  detail = await api<Course>(teacher.request, 'GET', `courses/${draft.courseId}`);
  expect(detail.versions.find(version => version.id === revision.id)?.status).toBe('UNPUBLISHED');

  await teacher.goto(`/teacher/courses/${draft.courseId}`);
  await expect(teacher.getByText(draft.title, { exact: true }).first()).toBeVisible();
  await expect(teacher.getByText(/Unpublished|ยกเลิกการเผยแพร่/i).first()).toBeVisible();
});

test('uploads real media through the MinIO presigned URL and marks it READY', async ({ browser: _browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'MinIO integration is exercised once.');
  const draft = await createDraft(teacher, 'MinIO upload');
  const bytes = Buffer.from('%PDF-1.4\nInstitute X Playwright MinIO integration\n%%EOF');
  const initialized = await api<{ assetId: string; uploadUrl: string }>(teacher.request, 'POST', `course-versions/${draft.versionId}/media/uploads`, {
    contentType: 'DOCUMENT',
    title: 'MinIO proof',
    fileName: 'qa-minio-proof.pdf',
    mimeType: 'application/pdf',
    sizeBytes: bytes.length,
    position: 1,
  });
  const put = await teacher.request.put(initialized.uploadUrl, {
    headers: { 'content-type': 'application/pdf' },
    data: bytes,
  });
  expect(put.ok(), await put.text()).toBeTruthy();
  const asset = await api<{ status: string; sizeBytes: number }>(teacher.request, 'POST', `media/${initialized.assetId}/complete`);
  expect(asset).toMatchObject({ status: 'READY', sizeBytes: bytes.length });

  await teacher.goto(`/teacher/courses/${draft.courseId}`);
  await expect(teacher.getByText('qa-minio-proof.pdf', { exact: true })).toBeVisible();
});

test('executive learning analytics matches a controlled completed enrollment', async ({ browser: _browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Controlled analytics workflow runs once.');

  const draft = await createDraft(teacher, 'Analytics controlled');
  const lesson = await addText(teacher, draft.versionId);
  const post = await addQuiz(teacher, draft.versionId, 'POST_TEST', 1);
  await publish(teacher, approver, draft.versionId);
  await api(student.request, 'POST', `courses/${draft.courseId}/enter`);
  await api(student.request, 'POST', `courses/${draft.courseId}/content/${lesson.id}/complete`);
  const attempt = await api<{ attemptId: string; questions: Question[] }>(student.request, 'POST', `post-tests/${post.id}/attempts`);
  await answerAttempt(student, 'post', attempt, post.questions, 1);

  const analytics = await api<{ courses: Array<{ courseId: string; enrollments: number; completed: number; completionRate: number; postTestAttempts: number; postTestAverage: number }> }>(executive.request, 'GET', 'executive/learning-analytics');
  expect(analytics.courses.find(course => course.courseId === draft.courseId)).toMatchObject({
    enrollments: 1,
    completed: 1,
    completionRate: 100,
    postTestAttempts: 1,
    postTestAverage: 100,
  });

  await executive.goto('/executive');
  const row = executive.getByRole('row').filter({ hasText: draft.title });
  await expect(row).toContainText('100.0%');
});
});
