const DEFAULT_BACKEND_URL = 'http://localhost:3000';

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return Response.json({ message: 'Invalid request origin' }, { status: 403 });
  const token = readSessionToken(request);
  const authorization = token ? `Bearer ${token}` : null;
  if (!authorization) return new Response(null, { status: 204, headers: { 'set-cookie': sessionCookie('', 0) } });
  try {
    await fetch(new URL('/api/auth/logout', process.env.BACKEND_BASE_URL ?? DEFAULT_BACKEND_URL), {
      method: 'POST', headers: { authorization }, cache: 'no-store',
    });
  } catch { /* Local logout still succeeds if the backend is unavailable. */ }
  return new Response(null, { status: 204, headers: { 'set-cookie': sessionCookie('', 0) } });
}
import { hasValidMutationOrigin, readSessionToken, sessionCookie } from '../session-cookie';
