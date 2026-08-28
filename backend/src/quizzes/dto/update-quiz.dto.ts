import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateQuizDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ minimum: 1, nullable: true, description: 'Null means untimed' })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationSeconds?: number | null;
}
