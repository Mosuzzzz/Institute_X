import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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

  @ApiPropertyOptional({
    enum: ['th', 'en', 'zh-CN', 'ja'],
    description: 'Primary language used to teach this Course',
  })
  @IsOptional()
  @IsString()
  @IsIn(['th', 'en', 'zh-CN', 'ja'])
  languageCode?: string;
}
