const DEFAULT_SSO_URL = 'https://mock-university-sso.vercel.app';

export async function GET(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return Response.json({ message: 'Bearer token is required' }, { status: 401 });
  }

  const ssoBaseUrl =
    process.env.SSO_BASE_URL ?? process.env.NEXT_PUBLIC_SSO_LOGIN_URL ?? DEFAULT_SSO_URL;

  try {
    const response = await fetch(new URL('/api/sso/me', ssoBaseUrl), {
      headers: { Authorization: authorization },
      cache: 'no-store',
    });
    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') ?? 'application/json',
        'cache-control': 'no-store',
      },
    });
  } catch {
    return Response.json({ message: 'SSO service is unavailable' }, { status: 503 });
  }
}
