import { ApiProperty } from '@nestjs/swagger';
import { AdminReportDto } from './admin-report.dto';

export class AdminReportsPageDto {
  @ApiProperty({ type: [AdminReportDto] })
  results: AdminReportDto[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;
}
