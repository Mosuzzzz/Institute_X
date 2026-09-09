export const SSO_STATE_KEY = 'institute-x:unused-sso-state';
export const SSO_TOKEN_KEY = 'institute-x:access-token';
export const SSO_TOKEN_EXPIRY_KEY = 'institute-x:token-expiry';
export const SSO_PROFILE_KEY = 'institute-x:user-profile';
export const ACTIVE_ROLE_KEY = 'institute-x:active-role';

export type ApplicationRole = 'STUDENT' | 'TEACHER' | 'APPROVER' | 'EXECUTIVE' | null;

export type SsoProfile = {
  id?: string;
  username?: string;
  name?: string;
  email?: string;
  roles?: Exclude<ApplicationRole, null>[];
  accountStatus?: 'ACTIVE' | 'INACTIVE';
};

export function getRoleHomePath(role: ApplicationRole): string | null {
  switch (role) {
    case 'STUDENT': return '/learning/courses';
    case 'TEACHER': return '/teaching/courses';
    case 'APPROVER': return '/reviewing';
    case 'EXECUTIVE': return '/dashboard';
    default: return null;
  }
}

export function resolveApplicationRole(profile: SsoProfile | null): ApplicationRole {
  if (!profile?.roles?.length) return null;
  const selected = sessionStorage.getItem(ACTIVE_ROLE_KEY) as ApplicationRole;
  return selected && profile.roles.includes(selected)
    ? selected
    : profile.roles.includes('STUDENT')
      ? 'STUDENT'
      : profile.roles[0];
}

export function setActiveRole(role: Exclude<ApplicationRole, null>): string | null {
  const profile = readStoredProfile();
  if (!profile?.roles?.includes(role)) return null;
  sessionStorage.setItem(ACTIVE_ROLE_KEY, role);
  return getRoleHomePath(role);
}

export function getSessionHomePath(): string | null {
  if (!hasActiveSsoSession()) return null;
  return getRoleHomePath(resolveApplicationRole(readStoredProfile()));
}

export function clearSsoSession() {
  sessionStorage.removeItem(SSO_STATE_KEY);
  sessionStorage.removeItem(SSO_TOKEN_KEY);
  sessionStorage.removeItem(SSO_TOKEN_EXPIRY_KEY);
  sessionStorage.removeItem(SSO_PROFILE_KEY);
  sessionStorage.removeItem(ACTIVE_ROLE_KEY);
}

export async function endSession(): Promise<void> {
  const token = sessionStorage.getItem(SSO_TOKEN_KEY);
  if (token) {
    await fetch('/api/auth/logout', { method: 'POST', headers: { authorization: `Bearer ${token}` } }).catch(() => undefined);
  }
  clearSsoSession();
}

export function readStoredProfile(): SsoProfile | null {
  const value = sessionStorage.getItem(SSO_PROFILE_KEY);
  if (!value) return null;
  try { return JSON.parse(value) as SsoProfile; }
  catch { clearSsoSession(); return null; }
}

export function storeSession(token: string, expiresAt: string, profile: SsoProfile) {
  sessionStorage.setItem(SSO_TOKEN_KEY, token);
  sessionStorage.setItem(SSO_TOKEN_EXPIRY_KEY, String(new Date(expiresAt).getTime()));
  sessionStorage.setItem(SSO_PROFILE_KEY, JSON.stringify(profile));
  if (profile.roles?.length) {
    sessionStorage.setItem(
      ACTIVE_ROLE_KEY,
      profile.roles.includes('STUDENT') ? 'STUDENT' : profile.roles[0],
    );
  }
}

export function hasActiveSsoSession() {
  const token = sessionStorage.getItem(SSO_TOKEN_KEY);
  const expiry = Number(sessionStorage.getItem(SSO_TOKEN_EXPIRY_KEY));
  if (!token || !Number.isFinite(expiry) || expiry <= Date.now()) {
    clearSsoSession();
    return false;
  }
  return true;
}
