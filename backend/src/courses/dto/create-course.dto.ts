import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

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

  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'One or more eligible Major identifiers',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  majorIds!: string[];
}
