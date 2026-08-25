import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class QuestionOptionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  optionText!: string;

  @ApiProperty()
  @IsBoolean()
  isCorrect!: boolean;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  position!: number;
}

export class AddQuestionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  questionText!: string;

  @ApiProperty({ minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  points!: number;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  position!: number;

  @ApiProperty({ type: [QuestionOptionDto], minItems: 2 })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options!: QuestionOptionDto[];
}
