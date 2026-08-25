import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType } from '@prisma/client';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class InitializeUploadDto {
  @ApiProperty({
    enum: [ContentType.VIDEO, ContentType.AUDIO, ContentType.IMAGE, ContentType.DOCUMENT],
  })
  @IsIn([ContentType.VIDEO, ContentType.AUDIO, ContentType.IMAGE, ContentType.DOCUMENT])
  contentType!: Exclude<ContentType, 'TEXT'>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  @Matches(/^[\w.+-]+\/[\w.+-]+$/)
  mimeType!: string;

  @ApiProperty({ minimum: 1, maximum: 1_073_741_824 })
  @IsInt()
  @Min(1)
  @Max(1_073_741_824)
  sizeBytes!: number;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  position!: number;
}
