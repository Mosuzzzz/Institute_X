import { IsUUID, Matches } from 'class-validator';
export class VerifyOtpDto {
  @IsUUID('4')
  challengeId!: string;
  @Matches(/^\d{6}$/)
  otp!: string;
}
