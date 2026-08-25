import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountStatus, UserRole } from '@prisma/client';
import { OidcUserInfoTokenVerifier } from './oidc-userinfo-token-verifier';

describe('OidcUserInfoTokenVerifier', () => {
  const config = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        OIDC_USERINFO_URL: 'https://sso.institute.example/oidc/userinfo',
        OIDC_ALLOWED_EMAIL_DOMAIN: 'institute.example',
        OIDC_ROLE_CLAIM: 'institute_role',
        OIDC_ACCOUNT_STATUS_CLAIM: 'account_status',
        OIDC_MAJOR_CODE_CLAIM: 'major_code',
      };
      return values[key];
    }),
  };
  let fetchSpy: jest.SpiedFunction<typeof fetch>;
  let verifier: OidcUserInfoTokenVerifier;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchSpy = jest.spyOn(globalThis, 'fetch');
    verifier = new OidcUserInfoTokenVerifier(config as unknown as ConfigService);
  });

  afterEach(() => fetchSpy.mockRestore());

  it('validates the token with UserInfo and maps trusted institutional claims', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          sub: 'subject-1',
          email: 'Student@Institute.Example',
          email_verified: true,
          name: 'Student One',
          institute_role: 'STUDENT',
          account_status: 'ACTIVE',
          major_code: 'CS',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    await expect(verifier.verify('access-token')).resolves.toEqual({
      subject: 'subject-1',
      universityEmail: 'student@institute.example',
      fullName: 'Student One',
      role: UserRole.STUDENT,
      accountStatus: AccountStatus.ACTIVE,
      majorCode: 'CS',
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://sso.institute.example/oidc/userinfo',
      expect.objectContaining({ headers: { Authorization: 'Bearer access-token' } }),
    );
  });

  it('rejects a token refused by the identity provider', async () => {
    fetchSpy.mockResolvedValue(new Response(null, { status: 401 }));

    await expect(verifier.verify('expired-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each([
    ['unverified email', { email_verified: false }],
    ['unknown role', { institute_role: 'ADMIN' }],
    ['missing subject', { sub: '' }],
    ['external email', { email: 'student@external.example' }],
  ])('rejects invalid identity claims: %s', async (_label, override) => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          sub: 'subject-1',
          email: 'student@institute.example',
          email_verified: true,
          name: 'Student One',
          institute_role: 'STUDENT',
          account_status: 'ACTIVE',
          major_code: 'CS',
          ...override,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    await expect(verifier.verify('invalid-claims')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
