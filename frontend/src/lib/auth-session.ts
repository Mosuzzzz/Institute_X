export const AUTH_TOKEN_EXPIRY_KEY = 'institute-x:token-expiry';
export const AUTH_PROFILE_KEY = 'institute-x:user-profile';
export const ACTIVE_ROLE_KEY = 'institute-x:active-role';

export type ApplicationRole = 'STUDENT' | 'TEACHER' | 'APPROVER' | 'REGISTRAR' | 'EXECUTIVE' | null;

export type AuthProfile = {
  id?: string;
  name?: string;
  email?: string;
  roles?: Exclude<ApplicationRole, null>[];
  accountStatus?: 'ACTIVE' | 'INACTIVE';
};

export function getRoleHomePath(role: ApplicationRole): string | null {
  switch (role) {
    case 'STUDENT': return '/student';
    case 'TEACHER': return '/teacher';
    case 'APPROVER': return '/approver';
    case 'REGISTRAR': return '/registrar';
    case 'EXECUTIVE': return '/executive';
    default: return null;
  }
}

export function resolveApplicationRole(profile: AuthProfile | null): ApplicationRole {
  if (!profile?.roles?.length) return null;
  const selected = sessionStorage.getItem(ACTIVE_ROLE_KEY) as ApplicationRole;
  return selected && profile.roles.includes(selected)
    ? selected
    : profile.roles.includes('STUDENT') ? 'STUDENT' : profile.roles[0];
}

export function setActiveRole(role: Exclude<ApplicationRole, null>): string | null {
  const profile = readStoredProfile();
  if (!profile?.roles?.includes(role)) return null;
  sessionStorage.setItem(ACTIVE_ROLE_KEY, role);
  return getRoleHomePath(role);
}

export function getSessionHomePath(): string | null {
  if (!hasActiveSession()) return null;
  return getRoleHomePath(resolveApplicationRole(readStoredProfile()));
}

export function clearAuthSession() {
  sessionStorage.removeItem(AUTH_TOKEN_EXPIRY_KEY);
  sessionStorage.removeItem(AUTH_PROFILE_KEY);
  sessionStorage.removeItem(ACTIVE_ROLE_KEY);
}

export async function endSession(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST', headers: { 'x-csrf-request': '1' } }).catch(() => undefined);
  clearAuthSession();
}

export function readStoredProfile(): AuthProfile | null {
  const value = sessionStorage.getItem(AUTH_PROFILE_KEY);
  if (!value) return null;
  try { return JSON.parse(value) as AuthProfile; }
  catch { clearAuthSession(); return null; }
}

export function storeSession(expiresAt: string, profile: AuthProfile) {
  sessionStorage.setItem(AUTH_TOKEN_EXPIRY_KEY, String(new Date(expiresAt).getTime()));
  sessionStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(profile));
  if (profile.roles?.length) sessionStorage.setItem(ACTIVE_ROLE_KEY, profile.roles.includes('STUDENT') ? 'STUDENT' : profile.roles[0]);
}

export function hasActiveSession() {
  const expiry = Number(sessionStorage.getItem(AUTH_TOKEN_EXPIRY_KEY));
  if (!Number.isFinite(expiry) || expiry <= Date.now() || !readStoredProfile()) {
    clearAuthSession();
    return false;
  }
  return true;
}
