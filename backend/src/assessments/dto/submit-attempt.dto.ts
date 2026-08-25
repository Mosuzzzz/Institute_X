import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID, ValidateNested } from 'class-validator';

class SubmittedAnswerDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  questionId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  optionId!: string;
}

export class SubmitAttemptDto {
  @ApiProperty({ type: [SubmittedAnswerDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmittedAnswerDto)
  answers!: SubmittedAnswerDto[];
}
