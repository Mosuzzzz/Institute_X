const DEFAULT_BACKEND_URL = 'http://localhost:3000';

export async function GET(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return Response.json({ message: 'Bearer token is required' }, { status: 401 });
  try {
    const response = await fetch(new URL('/api/auth/me', process.env.BACKEND_BASE_URL ?? DEFAULT_BACKEND_URL), { headers: { authorization }, cache: 'no-store' });
    return new Response(await response.arrayBuffer(), { status: response.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  } catch { return Response.json({ message: 'Institute X backend is unavailable' }, { status: 503 }); }
}
