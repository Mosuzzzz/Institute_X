import { IsEmail, Matches, MaxLength } from 'class-validator';
export class RequestOtpDto {
  @IsEmail()
  @MaxLength(320)
  @Matches(/^[^@\s]+@x\.ac\.th$/i, { message: 'email must use the @x.ac.th domain' })
  email!: string;
}
