import { ApiProperty } from '@nestjs/swagger';
import { Report, ReportReason, ReportStatus } from '@prisma/client';

export class AdminReportDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  reporterId: string;

  @ApiProperty()
  reporterFirstName: string;

  @ApiProperty()
  reportedId: string;

  @ApiProperty()
  reportedFirstName: string;

  @ApiProperty({ enum: ReportReason })
  reason: ReportReason;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ enum: ReportStatus })
  status: ReportStatus;

  @ApiProperty({ nullable: true })
  adminNote: string | null;

  @ApiProperty({ nullable: true })
  reviewedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(
    report: Report,
    reporterFirstName: string,
    reportedFirstName: string,
  ): AdminReportDto {
    const dto = new AdminReportDto();
    dto.id = report.id;
    dto.reporterId = report.reporterId;
    dto.reporterFirstName = reporterFirstName;
    dto.reportedId = report.reportedId;
    dto.reportedFirstName = reportedFirstName;
    dto.reason = report.reason;
    dto.description = report.description;
    dto.status = report.status;
    dto.adminNote = report.adminNote;
    dto.reviewedAt = report.reviewedAt;
    dto.createdAt = report.createdAt;
    return dto;
  }
}
