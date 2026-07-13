import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from './guards/admin.guard';
import { AdminReportsService } from './admin-reports.service';
import { AdminReportsQueryDto } from './dto/admin-reports-query.dto';
import { AdminReportsPageDto } from './dto/admin-reports-page.dto';
import { AdminReportDto } from './dto/admin-report.dto';
import { ReviewReportDto } from './dto/review-report.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly adminReportsService: AdminReportsService) {}

  @Get()
  @ApiOperation({
    summary: 'Admin-only: list user reports, optionally filtered by status',
  })
  list(@Query() query: AdminReportsQueryDto): Promise<AdminReportsPageDto> {
    return this.adminReportsService.listReports(query);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Admin-only: set a report status, add a note, optionally suspend the reported user',
  })
  review(
    @CurrentUser() admin: RequestUser,
    @Param('id') id: string,
    @Body() dto: ReviewReportDto,
  ): Promise<AdminReportDto> {
    return this.adminReportsService.reviewReport(id, dto, admin.userId);
  }
}
