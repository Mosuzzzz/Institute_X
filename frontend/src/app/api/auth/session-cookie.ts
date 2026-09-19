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
  const requestUrl = new URL(request.url);
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',').at(-1)?.trim();
  const host = request.headers.get('host')?.trim();
  const publicOrigin = forwardedProto && host
    ? `${forwardedProto}://${host}`
    : requestUrl.origin;
  return request.headers.get('x-csrf-request') === '1'
    && request.headers.get('sec-fetch-site') !== 'cross-site'
    && (!origin || origin === publicOrigin);
}
