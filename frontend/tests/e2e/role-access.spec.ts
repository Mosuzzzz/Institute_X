import { test, expect } from '@playwright/test';
import { authenticate } from './support/auth';
import { collectDiagnostics } from './support/diagnostics';

const accounts = [
  { email: 'student@x.ac.th', role: 'STUDENT', route: '/student' },
  { email: 'teacher@x.ac.th', role: 'TEACHER', route: '/teacher' },
  { email: 'approver@x.ac.th', role: 'APPROVER', route: '/approver' },
  { email: 'registrar@x.ac.th', role: 'REGISTRAR', route: '/registrar' },
  { email: 'executive@x.ac.th', role: 'EXECUTIVE', route: '/executive' },
] as const;

for (const account of accounts) {
  test(`${account.role} can open its workspace and sees only assigned switch targets`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Role matrix uses seeded accounts once to preserve OTP quotas.');
    const finish = collectDiagnostics(page, testInfo);
    const session = await authenticate(page, account.email, account.role);
    expect(session.user.roles).toContain('STUDENT');
    expect(session.user.roles).not.toContain('OWNER' as never);
    expect(session.user.roles).not.toContain('ADMIN' as never);
    await page.goto(account.route);
    await expect(page).toHaveURL(new RegExp(`${account.route}(?:/|$)`));
    await page.getByRole('button', { name: /^เปิดเมนูบัญชี|^Open profile menu|^打开|^アカウント/i }).click();
    const expected = session.user.roles.length > 1 ? session.user.roles.length : 0;
    await expect(page.getByRole('menu').getByRole('menuitem')).toHaveCount(expected + 1);
    await finish();
  });
}

for (const account of [
  { email: 'executive@x.ac.th', role: 'EXECUTIVE' as const },
  { email: 'student@x.ac.th', role: 'STUDENT' as const },
]) {
  test(`${account.role} is denied by backend when attempting a course mutation`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Uses a seeded role account once to preserve OTP quotas.');
    await authenticate(page, account.email, account.role);
    const response = await page.request.post('/api/backend/courses', {
      headers: { origin: 'http://localhost:3001', 'x-csrf-request': '1' },
      data: { title: 'qa-e2e-forbidden', languageCode: 'en', eligibilityMode: 'OPEN' },
    });
    expect(response.status()).toBe(403);
  });
}
