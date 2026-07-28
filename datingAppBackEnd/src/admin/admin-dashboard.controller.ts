import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { AdminDashboardService } from './admin-dashboard.service';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { GrowthDto } from './dto/growth.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Admin-only: platform-wide stats' })
  getStats(): Promise<DashboardStatsDto> {
    return this.dashboardService.getStats();
  }

  @Get('growth')
  @ApiOperation({
    summary: 'Admin-only: daily signups/matches/messages over the last N days (7-90, default 30)',
  })
  getGrowth(@Query('days') days?: string): Promise<GrowthDto> {
    return this.dashboardService.getGrowth(days ? Number(days) : 30);
  }
}
