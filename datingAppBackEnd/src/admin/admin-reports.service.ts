import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminUsersService } from './admin-users.service';
import { AdminReportsQueryDto } from './dto/admin-reports-query.dto';
import { AdminReportsPageDto } from './dto/admin-reports-page.dto';
import { AdminReportDto } from './dto/admin-report.dto';
import { ReviewReportDto } from './dto/review-report.dto';

@Injectable()
export class AdminReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminUsersService: AdminUsersService,
  ) {}

  async listReports(query: AdminReportsQueryDto): Promise<AdminReportsPageDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = query.status ? { status: query.status } : {};

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.report.count({ where }),
    ]);

    const userIds = [
      ...new Set(reports.flatMap((r) => [r.reporterId, r.reportedId])),
    ];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true },
    });
    const firstNameById = new Map(users.map((u) => [u.id, u.firstName]));

    return {
      results: reports.map((r) =>
        AdminReportDto.fromEntity(
          r,
          firstNameById.get(r.reporterId) ?? '',
          firstNameById.get(r.reportedId) ?? '',
        ),
      ),
      page,
      limit,
      total,
    };
  }

  async reviewReport(
    id: string,
    dto: ReviewReportDto,
    adminUserId: string,
  ): Promise<AdminReportDto> {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (dto.suspendReportedUser) {
      await this.adminUsersService.setActive(
        report.reportedId,
        false,
        adminUserId,
      );
    }

    const updated = await this.prisma.report.update({
      where: { id },
      data: {
        status: dto.status,
        adminNote: dto.adminNote,
        reviewedAt: new Date(),
      },
    });

    const users = await this.prisma.user.findMany({
      where: { id: { in: [updated.reporterId, updated.reportedId] } },
      select: { id: true, firstName: true },
    });
    const firstNameById = new Map(users.map((u) => [u.id, u.firstName]));

    return AdminReportDto.fromEntity(
      updated,
      firstNameById.get(updated.reporterId) ?? '',
      firstNameById.get(updated.reportedId) ?? '',
    );
  }
}
