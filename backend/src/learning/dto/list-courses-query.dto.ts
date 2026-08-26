import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ListCoursesQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by Course Category identifier' })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;
}
