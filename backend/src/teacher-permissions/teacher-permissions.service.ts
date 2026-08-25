import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  Prisma,
  TeacherPermissionRequest,
  TeacherPermissionStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface PermissionActor {
  id: string;
  role: UserRole;
}

type ReviewDecision =
  typeof TeacherPermissionStatus.APPROVED | typeof TeacherPermissionStatus.REJECTED;

@Injectable()
export class TeacherPermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async requestPermission(
    actor: PermissionActor,
    requestMessage?: string,
  ): Promise<TeacherPermissionRequest> {
    this.requireRole(actor, UserRole.TEACHER);
    const latest = await this.prisma.teacherPermissionRequest.findFirst({
      where: { teacherId: actor.id },
      orderBy: { requestedAt: 'desc' },
      select: { status: true },
    });
    if (
      latest?.status === TeacherPermissionStatus.PENDING ||
      latest?.status === TeacherPermissionStatus.APPROVED
    ) {
      throw new ConflictException('Teacher already has an active permission state');
    }

    try {
      return await this.prisma.teacherPermissionRequest.create({
        data: {
          teacherId: actor.id,
          requestMessage: requestMessage?.trim() || null,
          status: TeacherPermissionStatus.PENDING,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Teacher already has a pending request');
      }
      throw error;
    }
  }

  async review(
    actor: PermissionActor,
    requestId: string,
    decision: ReviewDecision,
    comment?: string,
  ): Promise<void> {
    this.requireRole(actor, UserRole.APPROVER);
    const normalizedComment = comment?.trim() || null;
    if (decision === TeacherPermissionStatus.REJECTED && normalizedComment === null) {
      throw new UnprocessableEntityException('A rejection comment is required');
    }

    const request = await this.findRequest(requestId);
    if (request.status !== TeacherPermissionStatus.PENDING) {
      throw new ConflictException('Permission request has already been decided');
    }

    const result = await this.prisma.teacherPermissionRequest.updateMany({
      where: { id: requestId, status: TeacherPermissionStatus.PENDING },
      data: {
        status: decision,
        reviewedById: actor.id,
        reviewComment: normalizedComment,
        reviewedAt: new Date(),
      },
    });
    if (result.count !== 1) {
      throw new ConflictException('Permission request was decided concurrently');
    }
  }

  async revoke(
    actor: PermissionActor,
    approvedRequestId: string,
    comment: string,
  ): Promise<TeacherPermissionRequest> {
    this.requireRole(actor, UserRole.APPROVER);
    const normalizedComment = comment.trim();
    if (!normalizedComment) {
      throw new UnprocessableEntityException('A revocation comment is required');
    }

    const approvedRequest = await this.findRequest(approvedRequestId);
    if (approvedRequest.status !== TeacherPermissionStatus.APPROVED) {
      throw new ConflictException('Only approved permission can be revoked');
    }

    return this.prisma.teacherPermissionRequest.create({
      data: {
        teacherId: approvedRequest.teacherId,
        status: TeacherPermissionStatus.REVOKED,
        reviewedById: actor.id,
        reviewComment: normalizedComment,
        reviewedAt: new Date(),
      },
    });
  }

  private async findRequest(requestId: string): Promise<TeacherPermissionRequest> {
    const request = await this.prisma.teacherPermissionRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('Teacher permission request was not found');
    }
    return request;
  }

  private requireRole(actor: PermissionActor, role: UserRole): void {
    if (actor.role !== role) {
      throw new ForbiddenException(`${role} role is required`);
    }
  }
}
