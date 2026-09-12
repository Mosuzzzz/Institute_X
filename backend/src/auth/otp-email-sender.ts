export abstract class OtpEmailSender {
  abstract send(email: string, otp: string): Promise<void>;
}
