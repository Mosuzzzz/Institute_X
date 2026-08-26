'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  clearSsoSession,
  resolveApplicationRole,
  SSO_PROFILE_KEY,
  SSO_STATE_KEY,
  SSO_TOKEN_EXPIRY_KEY,
  SSO_TOKEN_KEY,
  type SsoProfile,
} from '../../../lib/sso-session';

function expiresAt(expiresIn: string | null) {
  if (!expiresIn) return Date.now() + 60 * 60 * 1000;
  const match = expiresIn.match(/^(\d+)([hms])$/i);
  if (!match) return Date.now() + 60 * 60 * 1000;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = unit === 'h' ? 3_600_000 : unit === 'm' ? 60_000 : 1_000;
  return Date.now() + value * multiplier;
}

function extractProfile(payload: unknown): SsoProfile | null {
  if (!payload || typeof payload !== 'object') return null;
  const response = payload as Record<string, unknown>;
  const candidate = response.user && typeof response.user === 'object' ? response.user : response;
  const candidateProfile = candidate as SsoProfile;
  const status =
    response.status && typeof response.status === 'object'
      ? (response.status as Record<string, unknown>)
      : {};

  return {
    ...candidateProfile,
    role:
      typeof candidateProfile.role === 'string'
        ? candidateProfile.role
        : typeof response.role === 'string'
          ? response.role
          : undefined,
    is_active: typeof status.is_active === 'boolean' ? status.is_active : undefined,
    is_current_student:
      typeof status.is_current_student === 'boolean' ? status.is_current_student : undefined,
    is_educational_personnel:
      typeof status.is_educational_personnel === 'boolean'
        ? status.is_educational_personnel
        : undefined,
    personnel_type:
      typeof status.personnel_type === 'string' || status.personnel_type === null
        ? status.personnel_type
        : candidateProfile.personnel_type,
  };
}

export default function SsoCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const completeLogin = async () => {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const token = fragment.get('access_token');
      const tokenType = fragment.get('token_type');
      const returnedState = fragment.get('state');
      const expectedState = sessionStorage.getItem(SSO_STATE_KEY);

      window.history.replaceState(null, '', window.location.pathname);

      if (!token || tokenType?.toLowerCase() !== 'bearer') {
        clearSsoSession();
        setError('SSO did not return a valid Bearer token.');
        return;
      }

      if (!expectedState || !returnedState || expectedState !== returnedState) {
        clearSsoSession();
        setError('The SSO login state is invalid or has expired. Please sign in again.');
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (!response.ok) throw new Error('SSO profile request failed');
        const profile = extractProfile(await response.json());
        if (!profile) throw new Error('SSO profile is invalid');

        sessionStorage.removeItem(SSO_STATE_KEY);
        sessionStorage.setItem(SSO_TOKEN_KEY, token);
        sessionStorage.setItem(SSO_TOKEN_EXPIRY_KEY, String(expiresAt(fragment.get('expires_in'))));
        sessionStorage.setItem(SSO_PROFILE_KEY, JSON.stringify(profile));
        const applicationRole = resolveApplicationRole(profile);
        router.replace(
          applicationRole === 'TEACHER'
            ? '/teacher'
            : applicationRole === 'APPROVER'
              ? '/approver'
              : applicationRole === 'OWNER'
                ? '/owner'
                : '/student',
        );
      } catch {
        clearSsoSession();
        setError('We could not verify your SSO account. Please try again.');
      }
    };

    void completeLogin();
  }, [router]);

  return (
    <main className="callback-shell">
      <section className="callback-panel" aria-live="polite">
        <Image src="/logoX.png" alt="Institute X" width={58} height={58} priority />
        {error ? (
          <>
            <h1>Sign-in unsuccessful</h1>
            <p>{error}</p>
            <Link href="/">Return to sign in</Link>
          </>
        ) : (
          <>
            <span className="callback-spinner" aria-hidden="true" />
            <h1>Signing you in</h1>
            <p>Verifying your Institute X account…</p>
          </>
        )}
      </section>
    </main>
  );
}
