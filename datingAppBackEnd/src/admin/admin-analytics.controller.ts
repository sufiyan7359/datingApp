import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { AnalyticsService } from '../analytics/analytics.service';
import { AnalyticsSummaryDto } from '../analytics/dto/analytics-summary.dto';
import { AnalyticsSummaryQueryDto } from '../analytics/dto/analytics-summary-query.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({
    summary:
      'Admin-only: event counts by type over a period (default last 30 days)',
  })
  getSummary(
    @Query() query: AnalyticsSummaryQueryDto,
  ): Promise<AnalyticsSummaryDto> {
    return this.analyticsService.getSummary(query.days ?? 30);
  }
}
