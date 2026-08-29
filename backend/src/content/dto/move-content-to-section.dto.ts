import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsUUID, ValidateIf } from 'class-validator';

export class MoveContentToSectionDto {
  @ApiProperty({
    description: 'Target Section, or null to move the Lecture to General',
    nullable: true,
  })
  @IsDefined()
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsUUID('4')
  sectionId!: string | null;
}
