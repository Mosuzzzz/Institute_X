import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CourseEligibilityMode } from '@prisma/client';

export class CreateCourseDto {
  @ApiProperty({ example: 'Network Fundamentals' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ example: 'Introduction to computer networking' })
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  description?: string;

  @ApiProperty({ enum: CourseEligibilityMode, default: CourseEligibilityMode.OPEN })
  @IsEnum(CourseEligibilityMode)
  eligibilityMode!: CourseEligibilityMode;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'Eligible Major identifiers; empty when eligibilityMode is OPEN',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  majorIds!: string[];

  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'One or more Course Category identifiers',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  categoryIds!: string[];
}
