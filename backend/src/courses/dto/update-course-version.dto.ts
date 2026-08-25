import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCourseVersionDto {
  @ApiPropertyOptional({ example: 'Updated Network Fundamentals' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated course description', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  description?: string | null;
}
