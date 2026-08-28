import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
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

  @ApiPropertyOptional({
    enum: ['th', 'en', 'zh-CN', 'ja'],
    default: 'th',
    description: 'Primary language used to teach this Course',
  })
  @IsOptional()
  @IsString()
  @IsIn(['th', 'en', 'zh-CN', 'ja'])
  languageCode?: string;

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
