import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ReplaceCourseCategoriesDto {
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
