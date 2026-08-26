export const SSO_STATE_KEY = 'institute-x:sso-state';
export const SSO_TOKEN_KEY = 'institute-x:access-token';
export const SSO_TOKEN_EXPIRY_KEY = 'institute-x:token-expiry';
export const SSO_PROFILE_KEY = 'institute-x:sso-profile';

export type SsoProfile = {
  user_id?: string;
  username?: string;
  name?: string;
  email?: string;
  affiliation?: string;
  role?: string;
  major_code?: string | null;
  year_level?: number | null;
  is_active?: boolean;
  is_current_student?: boolean;
  is_educational_personnel?: boolean;
  personnel_type?: string | null;
};

export type ApplicationRole = 'STUDENT' | 'TEACHER' | 'APPROVER' | 'OWNER' | null;

export function resolveApplicationRole(profile: SsoProfile | null): ApplicationRole {
  if (!profile) return null;

  const explicitRole = profile.role?.trim().toUpperCase();
  if (explicitRole === 'TEACHER') return 'TEACHER';
  if (explicitRole === 'STUDENT') return 'STUDENT';
  if (explicitRole === 'APPROVER') return 'APPROVER';
  if (explicitRole === 'OWNER') return 'OWNER';

  const affiliation = profile.affiliation?.trim().toLowerCase();
  const personnelType = profile.personnel_type?.trim().toLowerCase();
  if (
    affiliation === 'lecturer' ||
    affiliation === 'teacher' ||
    personnelType === 'lecturer' ||
    personnelType === 'teacher'
  ) {
    return 'TEACHER';
  }
  if (profile.is_current_student === true || affiliation === 'student') return 'STUDENT';
  if (personnelType === 'approver') return 'APPROVER';
  if (personnelType === 'owner') return 'OWNER';
  return null;
}

export function clearSsoSession() {
  sessionStorage.removeItem(SSO_STATE_KEY);
  sessionStorage.removeItem(SSO_TOKEN_KEY);
  sessionStorage.removeItem(SSO_TOKEN_EXPIRY_KEY);
  sessionStorage.removeItem(SSO_PROFILE_KEY);
}

export function readStoredProfile(): SsoProfile | null {
  const storedProfile = sessionStorage.getItem(SSO_PROFILE_KEY);
  if (!storedProfile) return null;

  try {
    return JSON.parse(storedProfile) as SsoProfile;
  } catch {
    sessionStorage.removeItem(SSO_PROFILE_KEY);
    return null;
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
