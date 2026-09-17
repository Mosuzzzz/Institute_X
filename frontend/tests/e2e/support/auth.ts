import { expect, type APIRequestContext, type Page } from '@playwright/test';

const mailpitURL = process.env.E2E_MAILPIT_URL ?? 'http://127.0.0.1:8025';
const appOrigin = process.env.E2E_BASE_URL ?? 'http://localhost:3001';

type AuthProfile = {
  email: string;
  roles: Array<'STUDENT' | 'TEACHER' | 'APPROVER' | 'REGISTRAR' | 'EXECUTIVE'>;
  [key: string]: unknown;
};

export function uniqueStudentEmail(projectName: string, label: string): string {
  const safe = `${projectName}-${label}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 36);
  return `qa-e2e-${safe}-${Date.now()}@x.ac.th`;
}

export async function requestOtp(request: APIRequestContext, email: string) {
  const response = await request.post('/api/auth/otp/request', {
    headers: { origin: appOrigin, 'x-csrf-request': '1' },
    data: { email },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json() as Promise<{ challengeId: string; expiresAt: string }>;
}

export async function readLatestOtp(request: APIRequestContext, email: string): Promise<string> {
  let code = '';
  await expect.poll(async () => {
    const response = await request.get(`${mailpitURL}/api/v1/messages?limit=100`);
    if (!response.ok()) return '';
    const payload = await response.json() as { messages?: Array<{ To?: Array<{ Address?: string }>; Snippet?: string }> };
    const message = payload.messages?.find(item => item.To?.some(recipient => recipient.Address === email));
    code = message?.Snippet?.match(/\b\d{6}\b/)?.[0] ?? '';
    return code;
  }, { timeout: 10_000, message: `OTP email for ${email}` }).toMatch(/^\d{6}$/);
  return code;
}

export async function verifyOtp(request: APIRequestContext, challengeId: string, otp: string) {
  const response = await request.post('/api/auth/otp/verify', {
    headers: { origin: appOrigin, 'x-csrf-request': '1' },
    data: { challengeId, otp },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json() as Promise<{ expiresAt: string; user: AuthProfile }>;
}

export async function authenticate(page: Page, email: string, activeRole?: AuthProfile['roles'][number]) {
  const challenge = await requestOtp(page.request, email);
  const otp = await readLatestOtp(page.request, email);
  const session = await verifyOtp(page.request, challenge.challengeId, otp);
  await page.addInitScript(({ expiresAt, user, role }) => {
    sessionStorage.setItem('institute-x:token-expiry', String(new Date(expiresAt).getTime()));
    sessionStorage.setItem('institute-x:user-profile', JSON.stringify(user));
    sessionStorage.setItem('institute-x:active-role', role ?? (user.roles.includes('STUDENT') ? 'STUDENT' : user.roles[0]));
  }, { ...session, role: activeRole });
  return session;
}
