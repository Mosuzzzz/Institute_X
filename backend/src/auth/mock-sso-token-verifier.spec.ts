import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountStatus, UserRole } from '@prisma/client';
import { MockSsoTokenVerifier } from './mock-sso-token-verifier';

describe('MockSsoTokenVerifier', () => {
  const config = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'MOCK_SSO_ME_URL') return 'http://localhost:8080/api/sso/me';
      if (key === 'MOCK_SSO_VERIFY_URL') return 'http://localhost:8080/api/sso/verify';
      throw new Error(`Unexpected config: ${key}`);
    }),
    get: jest.fn((key: string, fallback?: unknown) => {
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

  it('maps a current Student directly from the authenticated /me profile', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          user: {
            user_id: '6600000001',
            username: '6600000001',
            name: 'Test Student',
            email: '6600000001@university.ac.th',
            major_code: 'CS',
            year_level: 3,
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
      username: '6600000001',
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
    expect(fetchSpy).toHaveBeenCalledTimes(1);
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

  it('uses the legacy /verify profile only when /me omits the Student Major', async () => {
    fetchSpy
      .mockResolvedValueOnce(
        responseFor({
          user_id: '6600000001',
          name: 'Test Student',
          email: '6600000001@university.ac.th',
          is_current_student: true,
          is_educational_personnel: false,
          personnel_type: null,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            valid: true,
            user: {
              user_id: '6600000001',
              name: 'Test Student',
              email: '6600000001@university.ac.th',
              major_code: 'CS',
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

    await expect(verifier.verify('mock-token')).resolves.toEqual(
      expect.objectContaining({ majorCode: 'CS' }),
    );
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('rejects generic staff personnel when the SSO role is absent', async () => {
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

    await expect(verifier.verify('staff-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it.each([
    ['teacher', UserRole.TEACHER],
    ['approver', UserRole.APPROVER],
    ['owner', UserRole.OWNER],
  ] as const)(
    'maps the SSO personnel type %s when an explicit role is absent',
    async (personnelType, expectedRole) => {
      fetchSpy.mockResolvedValue(
        responseFor({
          user_id: `EMP-${personnelType}`,
          name: `${personnelType} Account`,
          email: `${personnelType}@university.ac.th`,
          is_current_student: false,
          is_educational_personnel: true,
          personnel_type: personnelType,
        }),
      );

      await expect(verifier.verify(`${personnelType}-token`)).resolves.toEqual(
        expect.objectContaining({ role: expectedRole }),
      );
    },
  );

  it.each([
    [UserRole.STUDENT, true, false, null, 'CS'],
    [UserRole.TEACHER, false, true, 'lecturer', undefined],
    [UserRole.APPROVER, false, true, 'staff', undefined],
    [UserRole.OWNER, false, true, 'staff', undefined],
  ] as const)(
    'uses the explicit SSO role %s as the application role',
    async (role, isCurrentStudent, isEducationalPersonnel, personnelType, majorCode) => {
      fetchSpy.mockResolvedValue(
        responseFor({
          user_id: `USER-${role}`,
          name: `${role} Account`,
          email: `${role.toLowerCase()}@university.ac.th`,
          role,
          major_code: majorCode,
          is_current_student: isCurrentStudent,
          is_educational_personnel: isEducationalPersonnel,
          personnel_type: personnelType,
        }),
      );

      await expect(verifier.verify(`${role.toLowerCase()}-token`)).resolves.toEqual(
        expect.objectContaining({ role, majorCode }),
      );
    },
  );

  it('rejects an explicit SSO role outside the supported application roles', async () => {
    fetchSpy.mockResolvedValue(
      responseFor({
        user_id: 'ADMIN-1',
        name: 'Unexpected Admin',
        email: 'admin@university.ac.th',
        role: 'ADMIN',
        is_current_student: false,
        is_educational_personnel: true,
        personnel_type: 'staff',
      }),
    );

    await expect(verifier.verify('admin-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
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
  role?: string;
  major_code?: string;
  is_active?: boolean;
  is_current_student: boolean;
  is_educational_personnel: boolean;
  personnel_type: string | null;
}): Response {
  const { user_id, name, email, role, major_code, is_active = true, ...status } = input;
  return new Response(
    JSON.stringify({
      success: true,
      user: { user_id, name, email, role, major_code },
      status: { is_active, ...status },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}
