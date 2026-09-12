const DEFAULT_BACKEND_URL = 'http://localhost:3000';

export async function GET(request: Request) {
  const token = readSessionToken(request);
  if (!token) return Response.json({ message: 'Session is required' }, { status: 401 });
  const authorization = `Bearer ${token}`;
  try {
    const response = await fetch(new URL('/api/auth/me', process.env.BACKEND_BASE_URL ?? DEFAULT_BACKEND_URL), { headers: { authorization }, cache: 'no-store' });
    return new Response(await response.arrayBuffer(), { status: response.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  } catch { return Response.json({ message: 'Institute X backend is unavailable' }, { status: 503 }); }
}
import { readSessionToken } from '../session-cookie';
