import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ContentItem,
  ContentType,
  CourseSection,
  CourseVersionStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

interface ContentActor {
  id: string;
  role: UserRole;
}

interface AddTextInput {
  sectionId?: string;
  title?: string;
  textBody: string;
  position: number;
}

interface CreateSectionInput {
  title: string;
  position: number;
}

interface UpdateTextInput {
  title?: string | null;
  textBody?: string;
  position?: number;
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
    if (input.sectionId) {
      const section = await this.prisma.courseSection.findFirst({
        where: { id: input.sectionId, versionId },
        select: { id: true },
      });
      if (!section) throw new UnprocessableEntityException('Section does not belong to this Version');
    }

    try {
      return await this.prisma.contentItem.create({
        data: {
          versionId,
          ...(input.sectionId ? { sectionId: input.sectionId } : {}),
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

  async updateText(
    actor: ContentActor,
    contentId: string,
    input: UpdateTextInput,
  ): Promise<ContentItem> {
    this.requireTeacher(actor);
    if (input.title === undefined && input.textBody === undefined && input.position === undefined) {
      throw new UnprocessableEntityException('At least one text content field is required');
    }
    const data: UpdateTextInput = {};
    if (input.title !== undefined) {
      data.title = input.title?.trim() || null;
    }
    if (input.textBody !== undefined) {
      const textBody = input.textBody.trim();
      if (!textBody) {
        throw new UnprocessableEntityException('Text content is required');
      }
      data.textBody = textBody;
    }
    if (input.position !== undefined) {
      if (!Number.isInteger(input.position) || input.position < 1) {
        throw new UnprocessableEntityException('Content position must be a positive integer');
      }
      data.position = input.position;
    }
    await this.requireOwnedDraftText(actor, contentId);

    try {
      return await this.prisma.contentItem.update({ where: { id: contentId }, data });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Content position is already in use');
      }
      throw error;
    }
  }

  async deleteText(actor: ContentActor, contentId: string): Promise<void> {
    this.requireTeacher(actor);
    await this.requireOwnedDraftText(actor, contentId);
    await this.prisma.contentItem.delete({ where: { id: contentId } });
  }

  async createSection(
    actor: ContentActor,
    versionId: string,
    input: CreateSectionInput,
  ): Promise<CourseSection> {
    this.requireTeacher(actor);
    const title = input.title.trim();
    if (!title) throw new UnprocessableEntityException('Section title is required');
    if (!Number.isInteger(input.position) || input.position < 1) {
      throw new UnprocessableEntityException('Section position must be a positive integer');
    }
    await this.requireOwnedDraft(actor, versionId);
    try {
      return await this.prisma.courseSection.create({
        data: { versionId, title, position: input.position },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Section position is already in use');
      }
      throw error;
    }
  }

  private async requireOwnedDraftText(actor: ContentActor, contentId: string): Promise<void> {
    const content = await this.prisma.contentItem.findUnique({
      where: { id: contentId },
      include: {
        version: { include: { course: { select: { teacherId: true } } } },
      },
    });
    if (!content || content.contentType !== ContentType.TEXT) {
      throw new NotFoundException('Text Content Item was not found');
    }
    if (content.version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may edit this Course');
    }
    if (content.version.status !== CourseVersionStatus.DRAFT) {
      throw new ConflictException('Only a Draft Version may be changed');
    }
  }

  private requireTeacher(actor: ContentActor): void {
    if (actor.role !== UserRole.TEACHER) {
      throw new ForbiddenException('TEACHER role is required');
    }
  }

  private async requireOwnedDraft(actor: ContentActor, versionId: string): Promise<void> {
    const version = await this.prisma.courseVersion.findUnique({
      where: { id: versionId },
      include: { course: { select: { teacherId: true } } },
    });
    if (!version) throw new NotFoundException('Course Version was not found');
    if (version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may edit this Course');
    }
    if (version.status !== CourseVersionStatus.DRAFT) {
      throw new ConflictException('Only a Draft Version may be changed');
    }
  }
}
