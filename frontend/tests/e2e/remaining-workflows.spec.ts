import { test, expect } from '@playwright/test';
import { authenticate, uniqueStudentEmail } from './support/auth';

test('registrar grants and removes TEACHER, audit updates, and teacher can author immediately', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Disposable cross-role workflow runs once.');
  const resumedEmail = process.env.E2E_EXISTING_TEACHER_EMAIL;
  const email = resumedEmail ?? uniqueStudentEmail('workflow', 'registrar-teacher');

  const studentContext = resumedEmail ? null : await browser.newContext({ baseURL: 'http://localhost:3001' });
  if (studentContext) {
    const studentPage = await studentContext.newPage();
    const studentSession = await authenticate(studentPage, email, 'STUDENT');
    expect(studentSession.user.roles).toEqual(['STUDENT']);
  }

  const registrarContext = resumedEmail ? null : await browser.newContext({ baseURL: 'http://localhost:3001' });
  const registrarPage = registrarContext ? await registrarContext.newPage() : null;
  if (registrarPage) {
    await authenticate(registrarPage, 'registrar@x.ac.th', 'REGISTRAR');
    await registrarPage.goto('/registrar');
    await registrarPage.getByRole('searchbox').fill(email);
    const userRow = registrarPage.getByRole('row').filter({ hasText: email });
    await expect(userRow).toBeVisible();
    await userRow.getByRole('button', { name: /เพิ่ม.*ผู้สอน|Add.*TEACHER/i }).click();
    await expect(userRow).toContainText(/ผู้สอน|TEACHER/i);
  }

  const teacherContext = await browser.newContext({ baseURL: 'http://localhost:3001' });
  const teacherPage = await teacherContext.newPage();
  const teacherSession = await authenticate(teacherPage, email, 'TEACHER');
  expect(teacherSession.user.roles).toEqual(expect.arrayContaining(['STUDENT', 'TEACHER']));
  await teacherPage.goto('/teacher/courses/new');
  await expect(teacherPage.getByRole('textbox', { name: /ชื่อรายวิชา|Course title/i })).toBeVisible();

  const title = `QA E2E Draft ${Date.now()}`;
  await teacherPage.getByRole('textbox', { name: /ชื่อรายวิชา|Course title/i }).fill(title);
  await teacherPage.getByLabel(/รายละเอียด|Description/i).fill('Disposable course created by the Playwright workflow test.');
  await teacherPage.getByRole('checkbox').first().check();
  await teacherPage.getByRole('button', { name: /สร้างฉบับร่าง.*แก้ไขต่อ|Create Draft/i }).last().click();
  await expect(teacherPage).toHaveURL(/\/teacher\/courses\/[0-9a-f-]+$/i);
  await expect(teacherPage.getByText(title, { exact: true }).first()).toBeVisible();

  await teacherPage.reload();
  await expect(teacherPage.getByText(title, { exact: true }).first()).toBeVisible();
  await expect(teacherPage.getByRole('button', { name: /ส่ง.*ตรวจ|Submit.*review/i })).toBeDisabled();

  if (registrarPage) {
    await registrarPage.reload();
    await registrarPage.getByRole('searchbox').fill(email);
    const updatedRow = registrarPage.getByRole('row').filter({ hasText: email });
    await updatedRow.getByRole('button', { name: /ถอน.*ผู้สอน|Remove.*TEACHER/i }).click();
    await expect(updatedRow.getByRole('button', { name: /เพิ่ม.*ผู้สอน|Add.*TEACHER/i })).toBeVisible();
    await expect(registrarPage.getByText(email).last()).toBeVisible();
  }

  await Promise.all([studentContext?.close(), teacherContext.close(), registrarContext?.close()]);
});

test('new student can open the eligible catalog and invalid resources fail safely', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Disposable student workflow runs once.');
  const email = uniqueStudentEmail('workflow', 'student-catalog');
  await authenticate(page, email, 'STUDENT');
  await page.goto('/student/courses');
  await expect(page.getByRole('main')).toBeVisible();
  const courseLinks = page.getByRole('main').getByRole('link').filter({ hasText: '[Mock]' });
  expect(await courseLinks.count()).toBeGreaterThan(0);
  await courseLinks.first().click();
  await expect(page).toHaveURL(/\/student\/courses\/[0-9a-f-]+$/i);

  await page.goto('/student/courses/00000000-0000-4000-8000-000000000000');
  await expect(page.getByRole('alert').filter({ hasText: /ไม่สามารถโหลด|ไม่เปิดให้|unable to load|not available|无法加载|読み込めません/i })).toBeVisible();
});
