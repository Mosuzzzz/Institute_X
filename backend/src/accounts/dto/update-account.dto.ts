import { IsOptional, IsString, IsUUID, Length, ValidateIf } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @Length(2, 255)
  fullName?: string;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsUUID('4')
  majorId?: string | null;
}
