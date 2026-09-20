const DEFAULT_BACKEND_URL = 'http://localhost:3000';

export const dynamic = 'force-dynamic';

export async function GET() {
  const backendBaseUrl = process.env.BACKEND_BASE_URL ?? DEFAULT_BACKEND_URL;

  try {
    const response = await fetch(new URL('/api/ready', backendBaseUrl), {
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      return Response.json({ status: 'unavailable' }, { status: 503 });
    }

    return Response.json(
      { status: 'ok' },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503 });
  }
}
