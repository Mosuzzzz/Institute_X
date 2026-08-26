const DEFAULT_BACKEND_URL = 'http://localhost:3000';
const SUPPORTED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return Response.json({ message: 'Bearer token is required' }, { status: 401 });
  }

  const { path } = await context.params;
  if (!path.length || path.some((segment) => !segment || segment === '.' || segment === '..')) {
    return Response.json({ message: 'Backend API path is invalid' }, { status: 400 });
  }

  const backendBaseUrl = process.env.BACKEND_BASE_URL ?? DEFAULT_BACKEND_URL;
  const incomingUrl = new URL(request.url);
  const target = new URL(`/api/${path.map(encodeURIComponent).join('/')}`, backendBaseUrl);
  target.search = incomingUrl.search;

  const headers = new Headers({ authorization, accept: 'application/json' });
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' ? undefined : await request.arrayBuffer(),
      cache: 'no-store',
    });
    const body = response.status === 204 ? null : await response.arrayBuffer();

    return new Response(body, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') ?? 'application/json',
        'cache-control': 'no-store',
      },
    });
  } catch {
    return Response.json({ message: 'Institute X backend is unavailable' }, { status: 503 });
  }
}

export const dynamic = 'force-dynamic';
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { allow: [...SUPPORTED_METHODS, 'OPTIONS'].join(', ') },
  });
}
