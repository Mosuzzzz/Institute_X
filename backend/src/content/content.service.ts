import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ContentItem, ContentType, CourseVersionStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

interface ContentActor {
  id: string;
  role: UserRole;
}

interface AddTextInput {
  title?: string;
  textBody: string;
  position: number;
}

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async addText(actor: ContentActor, versionId: string, input: AddTextInput): Promise<ContentItem> {
    if (actor.role !== UserRole.TEACHER) {
      throw new ForbiddenException('TEACHER role is required');
    }
    if (!input.textBody.trim()) {
      throw new UnprocessableEntityException('Text content is required');
    }
    if (!Number.isInteger(input.position) || input.position < 1) {
      throw new UnprocessableEntityException('Content position must be a positive integer');
    }

    const version = await this.prisma.courseVersion.findUnique({
      where: { id: versionId },
      include: { course: { select: { teacherId: true } } },
    });
    if (!version) {
      throw new NotFoundException('Course Version was not found');
    }
    if (version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may edit this Course');
    }
    if (version.status !== CourseVersionStatus.DRAFT) {
      throw new ConflictException('Only a Draft Version may be changed');
    }

    try {
      return await this.prisma.contentItem.create({
        data: {
          versionId,
          contentType: ContentType.TEXT,
          title: input.title?.trim() || null,
          textBody: input.textBody.trim(),
          position: input.position,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Content position is already in use');
      }
      throw error;
    }
  }
}
