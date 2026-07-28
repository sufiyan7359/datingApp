import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { AdminUpdateProfileDto } from './dto/admin-update-profile.dto';
import { FakeProfileDetectionService } from '../ai/fake-profile-detection.service';
import { RiskAssessmentDto } from '../ai/dto/risk-assessment.dto';
import { ProfilesService } from '../profiles/profiles.service';
import { ProfileResponseDto } from '../profiles/dto/profile-response.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly adminUsersService: AdminUsersService,
    private readonly fakeProfileDetection: FakeProfileDetectionService,
    private readonly profilesService: ProfilesService,
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

  @Get(':id/profile')
  @ApiOperation({
    summary: "Admin-only: this user's full profile (bio, photos, interests, lifestyle, etc.)",
  })
  async getProfile(@Param('id') id: string): Promise<ProfileResponseDto> {
    const profile = await this.profilesService.getOrCreate(id);
    return ProfileResponseDto.fromEntity(profile);
  }

  @Patch(':id/profile')
  @ApiOperation({
    summary: "Admin-only: edit this user's profile fields (moderation - excludes their own premium/privacy settings)",
  })
  async updateProfile(
    @Param('id') id: string,
    @Body() dto: AdminUpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const profile = await this.profilesService.update(id, dto);
    return ProfileResponseDto.fromEntity(profile);
  }

  @Delete(':id/photos/:photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Admin-only: remove one of this user\'s photos (moderation)' })
  async deletePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ): Promise<void> {
    await this.profilesService.removePhoto(id, photoId);
  }
}
