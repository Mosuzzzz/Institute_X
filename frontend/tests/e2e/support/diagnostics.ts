import type { Page, TestInfo } from '@playwright/test';

export function collectDiagnostics(page: Page, testInfo: TestInfo) {
  const errors: string[] = [];
  const failedRequests: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText}`));
  return async () => {
    if (errors.length) await testInfo.attach('console-errors.txt', { body: errors.join('\n'), contentType: 'text/plain' });
    if (failedRequests.length) await testInfo.attach('failed-requests.txt', { body: failedRequests.join('\n'), contentType: 'text/plain' });
  };
}
