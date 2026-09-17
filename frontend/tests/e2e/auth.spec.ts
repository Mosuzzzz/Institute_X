import { test, expect } from '@playwright/test';
import { collectDiagnostics } from './support/diagnostics';
import { readLatestOtp, requestOtp, uniqueStudentEmail } from './support/auth';

test.describe('Email OTP authentication @core', () => {
  test('rejects non-institutional email without sending a request', async ({ page }, testInfo) => {
    const finish = collectDiagnostics(page, testInfo);
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/auth/otp/request')) requests.push(request.url());
    });
    await page.goto('/');
    await page.getByRole('textbox', { name: /@x\.ac\.th/i }).fill('student@example.com');
    await page.getByRole('button', { name: /OTP/i }).click();
    await expect(page.getByText('กรุณาใช้อีเมลสถาบัน @x.ac.th', { exact: true })).toBeVisible();
    expect(requests).toHaveLength(0);
    await finish();
  });

  test('valid OTP creates an HttpOnly session, persists on refresh, and logs out', async ({ page }, testInfo) => {
    const finish = collectDiagnostics(page, testInfo);
    const email = uniqueStudentEmail(testInfo.project.name, 'valid-login');
    await page.goto('/');
    await page.getByRole('textbox', { name: /@x\.ac\.th/i }).fill(email);
    await page.getByRole('button', { name: /OTP/i }).click();
    const otp = await readLatestOtp(page.request, email);
    await page.getByRole('textbox', { name: /OTP/i }).fill(otp);
    await page.getByRole('button', { name: /เข้าสู่ระบบ|sign in|登录|ログイン/i }).click();
    await expect(page).toHaveURL(/\/student(?:\/|$)/);

    const cookies = await page.context().cookies();
    const cookie = cookies.find(item => item.httpOnly && item.name.toLowerCase().includes('session'));
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax' });
    const browserStorage = await page.evaluate(() => JSON.stringify({ local: Object.entries(localStorage), session: Object.entries(sessionStorage) }));
    expect(browserStorage).not.toContain(cookie?.value ?? '__missing__');

    await page.reload();
    await expect(page).toHaveURL(/\/student(?:\/|$)/);
    await page.getByRole('button', { name: /^เปิดเมนูบัญชี|^Open profile menu|^打开|^アカウント/i }).click();
    await page.getByRole('menuitem', { name: /ออกจากระบบ|log out|退出|ログアウト/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Institute X' })).toBeVisible();
    await finish();
  });

  test('incorrect OTP is rejected and a consumed OTP cannot be reused', async ({ page }, testInfo) => {
    const email = uniqueStudentEmail(testInfo.project.name, 'otp-reuse');
    const challenge = await requestOtp(page.request, email);
    const otp = await readLatestOtp(page.request, email);
    const wrong = otp === '000000' ? '111111' : '000000';
    const headers = { origin: 'http://localhost:3001', 'x-csrf-request': '1' };
    const wrongResponse = await page.request.post('/api/auth/otp/verify', { headers, data: { challengeId: challenge.challengeId, otp: wrong } });
    expect(wrongResponse.status()).toBe(401);
    const success = await page.request.post('/api/auth/otp/verify', { headers, data: { challengeId: challenge.challengeId, otp } });
    expect(success.ok()).toBeTruthy();
    const reuse = await page.request.post('/api/auth/otp/verify', { headers, data: { challengeId: challenge.challengeId, otp } });
    expect(reuse.status()).toBe(401);
  });

  test('CSRF rejects a mutation without a trusted origin', async ({ request }) => {
    const response = await request.post('/api/auth/otp/request', { data: { email: 'qa-e2e-csrf@x.ac.th' } });
    expect(response.status()).toBe(403);
  });

  test('direct unauthenticated workspace URLs redirect to login', async ({ page }) => {
    for (const route of ['/student', '/teacher', '/approver', '/registrar', '/executive']) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole('heading', { name: 'Institute X' })).toBeVisible();
    }
  });
});

test('sixth OTP request is rate limited for an isolated mailbox', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'One quota check is sufficient.');
  const email = uniqueStudentEmail(testInfo.project.name, 'rate-limit');
  const headers = { origin: 'http://localhost:3001', 'x-csrf-request': '1' };
  for (let attempt = 0; attempt < 5; attempt += 1) {
    expect((await request.post('/api/auth/otp/request', { headers, data: { email } })).status()).toBe(200);
  }
  expect((await request.post('/api/auth/otp/request', { headers, data: { email } })).status()).toBe(429);
});
