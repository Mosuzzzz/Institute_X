import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CourseEligibilityMode, CourseVersionStatus, UserRole } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { AuthModule } from '../auth/auth.module';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, CurrentUserValue } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../database/prisma.service';

export class CreateCourseReportDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(5, 2000)
  reason!: string;
}

@Injectable()
export class CourseReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    user: CurrentUserValue,
    courseId: string,
    reason: string,
  ): Promise<{ submitted: boolean }> {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        archivedAt: null,
        versions: { some: { status: CourseVersionStatus.PUBLISHED } },
        OR: [
          { eligibilityMode: CourseEligibilityMode.OPEN },
          ...(user.majorId ? [{ allowedMajors: { some: { majorId: user.majorId } } }] : []),
        ],
      },
      select: { id: true },
    });
    if (!course) throw new NotFoundException('Course is not available');
    // Idempotent for retries and double clicks; never overwrite the original reason.
    await this.prisma.courseReport.createMany({
      data: [{ courseId, reporterId: user.id, reason }],
      skipDuplicates: true,
    });
    return { submitted: true };
  }

  list(): ReturnType<PrismaService['courseReport']['findMany']> {
    return this.prisma.courseReport.findMany({
      orderBy: [{ reviewedAt: 'asc' }, { createdAt: 'desc' }],
      take: 200,
      include: {
        reporter: { select: { fullName: true, universityEmail: true } },
        course: {
          select: {
            id: true,
            archivedAt: true,
            versions: { orderBy: { versionNumber: 'desc' }, take: 1, select: { title: true } },
          },
        },
      },
    });
  }

  async review(user: CurrentUserValue, id: string): Promise<{ reviewed: boolean }> {
    const result = await this.prisma.courseReport.updateMany({
      where: { id, reviewedAt: null },
      data: { reviewedAt: new Date(), reviewedById: user.id },
    });
    if (
      !result.count &&
      !(await this.prisma.courseReport.findUnique({ where: { id }, select: { id: true } }))
    ) {
      throw new NotFoundException('Report not found');
    }
    return { reviewed: true };
  }
}

@ApiTags('course-reports')
@ApiBearerAuth()
@Controller('course-reports')
@UseGuards(AuthGuard, RolesGuard)
export class CourseReportsController {
  constructor(private readonly reports: CourseReportsService) {}

  @Post('courses/:courseId')
  @Roles(UserRole.STUDENT)
  create(
    @CurrentUser() user: CurrentUserValue,
    @Param('courseId', ParseUUIDPipe) id: string,
    @Body() body: CreateCourseReportDto,
  ): ReturnType<CourseReportsService['create']> {
    return this.reports.create(user, id, body.reason);
  }

  @Get()
  @Roles(UserRole.APPROVER)
  list(): ReturnType<CourseReportsService['list']> {
    return this.reports.list();
  }

  @Patch(':reportId/review')
  @Roles(UserRole.APPROVER)
  review(
    @CurrentUser() user: CurrentUserValue,
    @Param('reportId', ParseUUIDPipe) id: string,
  ): ReturnType<CourseReportsService['review']> {
    return this.reports.review(user, id);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [CourseReportsController],
  providers: [CourseReportsService],
})
export class CourseReportsModule {}
