import { hasValidMutationOrigin, sessionCookie } from '../../session-cookie';

const DEFAULT_BACKEND_URL = 'http://localhost:3000';

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return Response.json({ message: 'Invalid request origin' }, { status: 403 });
  try {
    const response = await fetch(new URL('/api/auth/otp/verify', process.env.BACKEND_BASE_URL ?? DEFAULT_BACKEND_URL), {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: await request.text(), cache: 'no-store',
    });
    const payload = await response.json() as { token?: string; expiresAt?: string; user?: unknown; message?: string };
    if (!response.ok) return Response.json({ message: payload.message ?? 'Verification failed' }, { status: response.status });
    if (!payload.token || !payload.expiresAt || !payload.user || !Number.isFinite(Date.parse(payload.expiresAt))) {
      return Response.json({ message: 'Invalid authentication response' }, { status: 502 });
    }
    const maxAge = (new Date(payload.expiresAt).getTime() - Date.now()) / 1000;
    return Response.json({ expiresAt: payload.expiresAt, user: payload.user }, {
      headers: { 'set-cookie': sessionCookie(payload.token, maxAge), 'cache-control': 'no-store' },
    });
  } catch { return Response.json({ message: 'Institute X backend is unavailable' }, { status: 503 }); }
}
