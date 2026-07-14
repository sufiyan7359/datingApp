import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from './guards/admin.guard';
import { AdminUsersService } from './admin-users.service';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { AdminUsersPageDto } from './dto/admin-users-page.dto';
import { AdminUserDetailDto } from './dto/admin-user-detail.dto';
import { FakeProfileDetectionService } from '../ai/fake-profile-detection.service';
import { RiskAssessmentDto } from '../ai/dto/risk-assessment.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly adminUsersService: AdminUsersService,
    private readonly fakeProfileDetection: FakeProfileDetectionService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Admin-only: search/list users' })
  list(@Query() query: AdminUsersQueryDto): Promise<AdminUsersPageDto> {
    return this.adminUsersService.listUsers(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin-only: user detail with activity counts' })
  getDetail(@Param('id') id: string): Promise<AdminUserDetailDto> {
    return this.adminUsersService.getUserDetail(id);
  }

  @Get(':id/risk')
  @ApiOperation({
    summary:
      'Admin-only: heuristic fake-profile risk signals for this account (no photos, missing bio, reports, rapid swipe velocity, etc.) - a triage aid, not a verdict',
  })
  getRiskAssessment(@Param('id') id: string): Promise<RiskAssessmentDto> {
    return this.fakeProfileDetection.assess(id);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Admin-only: suspend an account (blocks login, revokes sessions)',
  })
  async suspend(
    @CurrentUser() admin: RequestUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.adminUsersService.setActive(id, false, admin.userId);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Admin-only: reactivate a suspended account' })
  async reactivate(
    @CurrentUser() admin: RequestUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.adminUsersService.setActive(id, true, admin.userId);
  }
}
