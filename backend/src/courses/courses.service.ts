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
    if (input.title === undefined && input.description === undefined) {
      throw new UnprocessableEntityException('At least one Course field is required');
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

  async createRevision(actor: CourseActor, courseId: string): Promise<CourseVersion> {
    this.requireTeacher(actor);
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        teacherId: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          select: {
            versionNumber: true,
            title: true,
            description: true,
            status: true,
          },
        },
      },
    });
    if (!course) {
      throw new NotFoundException('Course was not found');
    }
    if (course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may create a revision');
    }

    const activeStatuses: CourseVersionStatus[] = [
      CourseVersionStatus.DRAFT,
      CourseVersionStatus.SUBMITTED,
      CourseVersionStatus.REJECTED,
    ];
    if (course.versions.some((version) => activeStatuses.includes(version.status))) {
      throw new ConflictException('An active Course revision already exists');
    }
    const published = course.versions.find(
      (version) => version.status === CourseVersionStatus.PUBLISHED,
    );
    if (!published) {
      throw new ConflictException('A published Version is required before creating a revision');
    }

    try {
      return await this.prisma.courseVersion.create({
        data: {
          courseId,
          versionNumber: (course.versions[0]?.versionNumber ?? 0) + 1,
          title: published.title,
          description: published.description,
          status: CourseVersionStatus.DRAFT,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A Course revision was created concurrently');
      }
      throw error;
    }
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
