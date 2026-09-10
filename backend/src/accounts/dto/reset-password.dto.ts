import { IsString, Length } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @Length(12, 128)
  password!: string;
}
