import { ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { MailpitOtpEmailSender } from './mailpit-otp-email-sender';

jest.mock('nodemailer', () => ({ __esModule: true, default: { createTransport: jest.fn() } }));

describe('MailpitOtpEmailSender', () => {
  const sendMail = jest.fn();
  const config = { get: jest.fn() };
  beforeEach(() => {
    jest.resetAllMocks();
    config.get.mockImplementation((key: string, fallback?: unknown) =>
      key === 'NODE_ENV' ? 'development' : fallback,
    );
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
  });
  it('delivers a mock institutional OTP using local SMTP', async () => {
    await new MailpitOtpEmailSender(config as never).send('student@x.ac.th', '123456');
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: '127.0.0.1',
        port: 1025,
        secure: false,
        ignoreTLS: true,
        connectionTimeout: 10000,
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'student@x.ac.th', text: expect.stringContaining('123456') }),
    );
  });
  it('refuses mock delivery in production', async () => {
    config.get.mockReturnValue('production');
    await expect(
      new MailpitOtpEmailSender(config as never).send('student@x.ac.th', '123456'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });
  it('sanitizes SMTP failures', async () => {
    sendMail.mockRejectedValue(new Error('private SMTP details'));
    await expect(
      new MailpitOtpEmailSender(config as never).send('student@x.ac.th', '123456'),
    ).rejects.toThrow('Mock OTP email delivery failed');
  });
});
