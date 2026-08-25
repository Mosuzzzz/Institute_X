import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  CourseVersion,
  CourseVersionStatus,
  Prisma,
  TeacherPermissionStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface CourseActor {
  id: string;
  role: UserRole;
}

export interface CreateCourseInput {
  title: string;
  description?: string;
  majorIds: string[];
}

export interface UpdateDraftInput {
  title?: string;
  description?: string | null;
}

type CreatedCourse = Prisma.CourseGetPayload<{
  include: { allowedMajors: true; versions: true };
}>;

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async createCourse(actor: CourseActor, input: CreateCourseInput): Promise<CreatedCourse> {
    this.requireTeacher(actor);
    this.validateMajorIds(input.majorIds);
    const title = input.title.trim();
    if (!title) {
      throw new UnprocessableEntityException('Course title is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const latestPermission = await tx.teacherPermissionRequest.findFirst({
        where: { teacherId: actor.id },
        orderBy: { requestedAt: 'desc' },
        select: { status: true },
      });
      if (latestPermission?.status !== TeacherPermissionStatus.APPROVED) {
        throw new ForbiddenException('Approved Teacher permission is required');
      }

      const majorCount = await tx.major.count({
        where: { id: { in: input.majorIds } },
      });
      if (majorCount !== input.majorIds.length) {
        throw new UnprocessableEntityException('One or more eligible Majors are unknown');
      }

      return tx.course.create({
        data: {
          teacherId: actor.id,
          allowedMajors: {
            create: input.majorIds.map((majorId) => ({ majorId })),
          },
          versions: {
            create: {
              versionNumber: 1,
              title,
              description: input.description?.trim() || null,
              status: CourseVersionStatus.DRAFT,
            },
          },
        },
        include: { allowedMajors: true, versions: true },
      });
    });
  }

  async updateDraft(
    actor: CourseActor,
    versionId: string,
    input: UpdateDraftInput,
  ): Promise<CourseVersion> {
    this.requireTeacher(actor);
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
      throw new ConflictException('Only a Draft Version may be edited');
    }

    const data: UpdateDraftInput = {};
    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) {
        throw new UnprocessableEntityException('Course title is required');
      }
      data.title = title;
    }
    if (input.description !== undefined) {
      data.description = input.description?.trim() || null;
    }

    return this.prisma.courseVersion.update({
      where: { id: versionId },
      data,
    });
  }

  private validateMajorIds(majorIds: string[]): void {
    if (majorIds.length === 0) {
      throw new UnprocessableEntityException('At least one eligible Major is required');
    }
    if (new Set(majorIds).size !== majorIds.length) {
      throw new UnprocessableEntityException('Eligible Majors must not contain duplicates');
    }
  }

  private requireTeacher(actor: CourseActor): void {
    if (actor.role !== UserRole.TEACHER) {
      throw new ForbiddenException('TEACHER role is required');
    }
  }
}
