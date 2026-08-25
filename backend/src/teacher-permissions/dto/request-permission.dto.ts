import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestPermissionDto {
  @ApiPropertyOptional({ example: 'I would like to create online Courses.' })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  requestMessage?: string;
}
