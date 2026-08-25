import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuizType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateQuizDto {
  @ApiProperty({ enum: QuizType })
  @IsEnum(QuizType)
  quizType!: QuizType;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ minimum: 1, description: 'Null/omitted means untimed' })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationSeconds?: number;
}
