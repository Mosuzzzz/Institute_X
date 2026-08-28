import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateCourseSectionDto {
  @ApiProperty({ example: 'Section 1: Introduction' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  position!: number;
}
