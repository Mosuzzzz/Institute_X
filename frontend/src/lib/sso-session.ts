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
  major_code?: string | null;
  year_level?: number | null;
};

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
