import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpEmailSender } from './otp-email-sender';

@Injectable()
export class ResendOtpEmailSender extends OtpEmailSender {
  constructor(private readonly config: ConfigService) {
    super();
  }
  async send(email: string, otp: string): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('OTP_FROM_EMAIL');
    if (!apiKey || !from)
      throw new ServiceUnavailableException('OTP email delivery is unavailable');
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [email],
          subject: 'Institute X verification code',
          text: `Your Institute X verification code is ${otp}. It expires in 5 minutes.`,
        }),
      });
      if (!response.ok) throw new ServiceUnavailableException('OTP email delivery failed');
    } catch {
      throw new ServiceUnavailableException('OTP email delivery failed');
    }
  }
}
