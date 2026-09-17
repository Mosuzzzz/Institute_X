import { test, expect } from '@playwright/test';
import { collectDiagnostics } from './support/diagnostics';

const viewports = [
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

test('login remains usable without horizontal clipping at representative widths @core', async ({ page }, testInfo) => {
  const finish = collectDiagnostics(page, testInfo);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByRole('textbox', { name: /@x\.ac\.th/i })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${viewport.name} horizontal overflow`).toBeLessThanOrEqual(1);
  }
  await finish();
});

test('all four languages persist across refresh and expose translated login controls', async ({ page }) => {
  await page.goto('/');
  const expectations = [
    { option: 'ภาษาไทย', lang: 'th', button: /ส่งรหัส OTP/ },
    { option: 'English', lang: 'en', button: /Send OTP/ },
    { option: '中文', lang: 'zh-CN', button: /发送验证码/ },
    { option: '日本語', lang: 'ja', button: /確認コードを送信/ },
  ];
  for (const item of expectations) {
    await page.getByRole('button', { name: /language|ภาษา|语言|言語/i }).click();
    await page.getByRole('option', { name: item.option }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', item.lang);
    await expect(page.getByRole('button', { name: item.button })).toBeVisible();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', item.lang);
  }
});
