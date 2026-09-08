const DEFAULT_BACKEND_URL = 'http://localhost:3000';

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return new Response(null, { status: 204 });
  try {
    await fetch(new URL('/api/auth/logout', process.env.BACKEND_BASE_URL ?? DEFAULT_BACKEND_URL), {
      method: 'POST', headers: { authorization }, cache: 'no-store',
    });
  } catch { /* Local logout still succeeds if the backend is unavailable. */ }
  return new Response(null, { status: 204 });
}
