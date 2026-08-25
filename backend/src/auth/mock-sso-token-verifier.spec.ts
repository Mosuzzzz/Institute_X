import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountStatus, UserRole } from '@prisma/client';
import { MockSsoTokenVerifier } from './mock-sso-token-verifier';

describe('MockSsoTokenVerifier', () => {
  const config = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'MOCK_SSO_ME_URL') return 'http://localhost:8080/api/sso/me';
      throw new Error(`Unexpected config: ${key}`);
    }),
    get: jest.fn((key: string, fallback?: unknown) => {
      if (key === 'MOCK_SSO_DEFAULT_MAJOR_CODE') return 'CS';
      if (key === 'MOCK_SSO_STAFF_ROLE') return UserRole.APPROVER;
      return fallback;
    }),
  };
  let fetchSpy: jest.SpiedFunction<typeof fetch>;
  let verifier: MockSsoTokenVerifier;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchSpy = jest.spyOn(globalThis, 'fetch');
    verifier = new MockSsoTokenVerifier(config as unknown as ConfigService);
  });

  afterEach(() => fetchSpy.mockRestore());

  it('maps a current Student and supplies the configured development Major', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          user: {
            user_id: '6600000001',
            name: 'Test Student',
            email: '6600000001@university.ac.th',
          },
          status: {
            is_active: true,
            is_current_student: true,
            is_educational_personnel: false,
            personnel_type: null,
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    await expect(verifier.verify('mock-token')).resolves.toEqual({
      subject: '6600000001',
      universityEmail: '6600000001@university.ac.th',
      fullName: 'Test Student',
      role: UserRole.STUDENT,
      accountStatus: AccountStatus.ACTIVE,
      majorCode: 'CS',
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8080/api/sso/me',
      expect.objectContaining({ headers: { Authorization: 'Bearer mock-token' } }),
    );
  });

  it('maps lecturer personnel to TEACHER', async () => {
    fetchSpy.mockResolvedValue(
      responseFor({
        user_id: 'EMP0001',
        name: 'Test Lecturer',
        email: 'lecturer@university.ac.th',
        is_current_student: false,
        is_educational_personnel: true,
        personnel_type: 'lecturer',
      }),
    );

    await expect(verifier.verify('lecturer-token')).resolves.toEqual(
      expect.objectContaining({ role: UserRole.TEACHER, majorCode: undefined }),
    );
  });

  it('maps staff personnel to the configured application role', async () => {
    fetchSpy.mockResolvedValue(
      responseFor({
        user_id: 'EMP0002',
        name: 'Test Staff',
        email: 'staff@university.ac.th',
        is_current_student: false,
        is_educational_personnel: true,
        personnel_type: 'staff',
      }),
    );

    await expect(verifier.verify('staff-token')).resolves.toEqual(
      expect.objectContaining({ role: UserRole.APPROVER }),
    );
  });

  it('maps an inactive identity so synchronization denies access', async () => {
    fetchSpy.mockResolvedValue(
      responseFor({
        user_id: '6200000001',
        name: 'Former Student',
        email: '6200000001@university.ac.th',
        is_active: false,
        is_current_student: false,
        is_educational_personnel: false,
        personnel_type: null,
      }),
    );

    await expect(verifier.verify('inactive-token')).resolves.toEqual(
      expect.objectContaining({ accountStatus: AccountStatus.INACTIVE }),
    );
  });

  it('rejects an invalid token response without exposing Mock SSO details', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ success: false, message: 'Invalid or expired token' }), {
        status: 401,
      }),
    );

    await expect(verifier.verify('invalid-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

function responseFor(input: {
  user_id: string;
  name: string;
  email: string;
  is_active?: boolean;
  is_current_student: boolean;
  is_educational_personnel: boolean;
  personnel_type: string | null;
}): Response {
  const { user_id, name, email, is_active = true, ...status } = input;
  return new Response(
    JSON.stringify({
      success: true,
      user: { user_id, name, email },
      status: { is_active, ...status },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}
