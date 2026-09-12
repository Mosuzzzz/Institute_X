export const SESSION_COOKIE = 'institute_x_session';

export function readSessionToken(request: Request): string | null {
  const raw = request.headers.get('cookie') ?? '';
  const value = raw.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  try {
    return value ? decodeURIComponent(value.slice(SESSION_COOKIE.length + 1)) : null;
  } catch {
    return null;
  }
}

export function sessionCookie(token: string, maxAgeSeconds: number): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

export function hasValidMutationOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return request.headers.get('x-csrf-request') === '1'
    && request.headers.get('sec-fetch-site') !== 'cross-site'
    && (!origin || origin === new URL(request.url).origin);
}
