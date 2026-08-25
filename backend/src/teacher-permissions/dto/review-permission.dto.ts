import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeacherPermissionStatus } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewPermissionDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn([TeacherPermissionStatus.APPROVED, TeacherPermissionStatus.REJECTED])
  decision!: typeof TeacherPermissionStatus.APPROVED | typeof TeacherPermissionStatus.REJECTED;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  comment?: string;
}
