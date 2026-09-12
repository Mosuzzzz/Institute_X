import { AccountStatus, UserRole } from '@prisma/client';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    emailOtp: { count: jest.fn(), create: jest.fn(), deleteMany: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() },
    user: { upsert: jest.fn() },
    authSession: { create: jest.fn(), findUnique: jest.fn(), deleteMany: jest.fn() },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };
  const cache = { get: jest.fn(), set: jest.fn(), delete: jest.fn() };
  const config = { getOrThrow: jest.fn() };
  const emails = { send: jest.fn() };
  const service = new AuthService(prisma as never, cache as never, config as never, emails as never);

  beforeEach(() => {
    jest.resetAllMocks();
    config.getOrThrow.mockReturnValue('test-otp-secret-at-least-32-characters');
    prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => unknown) => callback(prisma));
  });

  it('rejects email addresses outside the institutional domain', async () => {
    await expect(service.requestOtp('person@example.com')).rejects.toThrow('Use your @x.ac.th email address');
    expect(prisma.emailOtp.create).not.toHaveBeenCalled();
  });

  it('creates a five-minute hashed challenge and sends a six-digit OTP', async () => {
    prisma.emailOtp.count.mockResolvedValue(0);
    prisma.emailOtp.create.mockResolvedValue({ id: 'challenge' });
    emails.send.mockResolvedValue(undefined);
    const before = Date.now();
    const result = await service.requestOtp(' Person@x.ac.th ', '127.0.0.1');
    expect(result.challengeId).toBe('challenge');
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 299_000);
    expect(emails.send).toHaveBeenCalledWith('person@x.ac.th', expect.stringMatching(/^\d{6}$/));
    expect(prisma.emailOtp.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: 'person@x.ac.th', otpHash: expect.stringMatching(/^[a-f0-9]{64}$/), requestedBy: expect.stringMatching(/^[a-f0-9]{64}$/) }),
      select: { id: true },
    });
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it('limits OTP requests within a serialized database transaction', async () => {
    prisma.emailOtp.count.mockResolvedValue(5);
    await expect(service.requestOtp('person@x.ac.th', '127.0.0.1')).rejects.toThrow('Too many OTP requests');
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.emailOtp.create).not.toHaveBeenCalled();
    expect(emails.send).not.toHaveBeenCalled();
  });

  it('verifies an OTP once and creates a new user with only STUDENT', async () => {
    prisma.emailOtp.count.mockResolvedValue(0);
    prisma.emailOtp.create.mockResolvedValue({ id: 'challenge' });
    emails.send.mockResolvedValue(undefined);
    await service.requestOtp('new.user@x.ac.th');
    const otp = emails.send.mock.calls[0][1] as string;
    const otpHash = prisma.emailOtp.create.mock.calls[0][0].data.otpHash as string;
    prisma.emailOtp.findUnique.mockResolvedValue({ id: 'challenge', email: 'new.user@x.ac.th', otpHash, attempts: 0, usedAt: null, expiresAt: new Date(Date.now() + 300_000) });
    prisma.emailOtp.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.upsert.mockResolvedValue({ id: 'user', universityEmail: 'new.user@x.ac.th', fullName: 'New User', accountStatus: AccountStatus.ACTIVE, majorId: null, roles: [{ role: UserRole.STUDENT }] });
    prisma.authSession.create.mockResolvedValue({});
    const result = await service.verifyOtp('challenge', otp);
    expect(result.user.roles).toEqual([UserRole.STUDENT]);
    expect(prisma.user.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ emailVerifiedAt: expect.any(Date), roles: { create: { role: UserRole.STUDENT } } }) }));
    expect(prisma.emailOtp.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ usedAt: null }), data: { usedAt: expect.any(Date) } }));
  });

  it('returns a valid Redis cache hit without querying PostgreSQL', async () => {
    const session = { id: 'user-id', role: UserRole.STUDENT, roles: [UserRole.STUDENT], accountStatus: AccountStatus.ACTIVE, majorId: null };
    cache.get.mockResolvedValue(session);
    await expect(service.authenticate('token')).resolves.toEqual(session);
    expect(prisma.authSession.findUnique).not.toHaveBeenCalled();
  });

  it('rejects expired or already-used OTPs before creating an account', async () => {
    prisma.emailOtp.findUnique.mockResolvedValue({ usedAt: null, expiresAt: new Date(Date.now() - 1) });
    await expect(service.verifyOtp('expired', '123456')).rejects.toThrow('Verification code is invalid or expired');
    prisma.emailOtp.findUnique.mockResolvedValue({ usedAt: new Date(), expiresAt: new Date(Date.now() + 60_000) });
    await expect(service.verifyOtp('used', '123456')).rejects.toThrow('Verification code is invalid or expired');
    expect(prisma.user.upsert).not.toHaveBeenCalled();
  });

  it('blocks verification after five attempts', async () => {
    prisma.emailOtp.findUnique.mockResolvedValue({ email: 'user@x.ac.th', usedAt: null, expiresAt: new Date(Date.now() + 60_000), otpHash: '0'.repeat(64) });
    prisma.emailOtp.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.verifyOtp('challenge', '123456')).rejects.toThrow('Too many verification attempts');
    expect(prisma.user.upsert).not.toHaveBeenCalled();
  });

  it('rejects an incorrect OTP without creating an account', async () => {
    prisma.emailOtp.findUnique.mockResolvedValue({ email: 'user@x.ac.th', usedAt: null, expiresAt: new Date(Date.now() + 60_000), otpHash: '0'.repeat(64) });
    prisma.emailOtp.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.verifyOtp('challenge', '123456')).rejects.toThrow('Verification code is invalid or expired');
    expect(prisma.user.upsert).not.toHaveBeenCalled();
  });

  it('invalidates PostgreSQL and Redis sessions on logout', async () => {
    prisma.authSession.deleteMany.mockResolvedValue({ count: 1 });
    cache.delete.mockResolvedValue(undefined);
    await service.logout('token');
    expect(prisma.authSession.deleteMany).toHaveBeenCalled();
    expect(cache.delete).toHaveBeenCalledWith(expect.any(String));
  });
});
