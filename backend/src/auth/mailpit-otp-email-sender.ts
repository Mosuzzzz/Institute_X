import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { OtpEmailSender } from './otp-email-sender';

@Injectable()
export class MailpitOtpEmailSender extends OtpEmailSender {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async send(email: string, otp: string): Promise<void> {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new ServiceUnavailableException('Mock email delivery is forbidden in production');
    }
    const transport = nodemailer.createTransport({
      host: this.config.get<string>('MAILPIT_HOST', '127.0.0.1'),
      port: this.config.get<number>('MAILPIT_SMTP_PORT', 1025),
      secure: false,
      ignoreTLS: true,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
    });
    try {
      await transport.sendMail({
        from: this.config.get<string>('OTP_FROM_EMAIL', 'Institute X <no-reply@x.ac.th>'),
        to: email,
        subject: 'Institute X verification code (MOCK)',
        text: `Your Institute X verification code is ${otp}. It expires in 5 minutes. This is a mock email, not proof of mailbox ownership.`,
      });
    } catch {
      throw new ServiceUnavailableException('Mock OTP email delivery failed');
    }
  }
}
