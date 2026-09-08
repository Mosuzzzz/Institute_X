const DEFAULT_BACKEND_URL = 'http://localhost:3000';

export async function POST(request: Request) {
  try {
    const response = await fetch(new URL('/api/auth/login', process.env.BACKEND_BASE_URL ?? DEFAULT_BACKEND_URL), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: await request.text(),
      cache: 'no-store',
    });
    return new Response(await response.arrayBuffer(), { status: response.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  } catch { return Response.json({ message: 'Institute X backend is unavailable' }, { status: 503 }); }
}
