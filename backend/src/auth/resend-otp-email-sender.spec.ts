import { ServiceUnavailableException } from '@nestjs/common';
import { ResendOtpEmailSender } from './resend-otp-email-sender';

describe('ResendOtpEmailSender', () => {
  const originalFetch = global.fetch;
  const config = { get: jest.fn() };
  const fetchMock = jest.fn();
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = fetchMock;
    config.get.mockImplementation((key: string) =>
      key === 'RESEND_API_KEY' ? 'test-key' : 'Institute X <login@x.ac.th>',
    );
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sends the code with a bounded network timeout', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    await new ResendOtpEmailSender(config as never).send('student@x.ac.th', '123456');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        body: JSON.stringify({
          from: 'Institute X <login@x.ac.th>',
          to: ['student@x.ac.th'],
          subject: 'Institute X verification code',
          text: 'Your Institute X verification code is 123456. It expires in 5 minutes.',
        }),
      }),
    );
  });

  it('returns an availability error instead of exposing provider network details', async () => {
    fetchMock.mockRejectedValue(new Error('private provider details'));
    await expect(
      new ResendOtpEmailSender(config as never).send('student@x.ac.th', '123456'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('does not call the provider without credentials', async () => {
    config.get.mockReturnValue(undefined);
    await expect(
      new ResendOtpEmailSender(config as never).send('student@x.ac.th', '123456'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
