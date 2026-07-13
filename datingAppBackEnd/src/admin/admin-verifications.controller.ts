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
import { AdminGuard } from './guards/admin.guard';
import { AdminVerificationsService } from './admin-verifications.service';
import { AdminVerificationsQueryDto } from './dto/admin-verifications-query.dto';
import { AdminVerificationsPageDto } from './dto/admin-verifications-page.dto';
import { AdminVerificationDto } from './dto/admin-verification.dto';
import { ReviewVerificationDto } from './dto/review-verification.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/verifications')
export class AdminVerificationsController {
  constructor(
    private readonly adminVerificationsService: AdminVerificationsService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Admin-only: list identity verification requests (defaults to the pending queue)',
  })
  list(
    @Query() query: AdminVerificationsQueryDto,
  ): Promise<AdminVerificationsPageDto> {
    return this.adminVerificationsService.list(query);
  }

  @Patch(':userId')
  @ApiOperation({
    summary: 'Admin-only: approve or reject a verification request',
  })
  review(
    @Param('userId') userId: string,
    @Body() dto: ReviewVerificationDto,
  ): Promise<AdminVerificationDto> {
    return this.adminVerificationsService.review(userId, dto);
  }
}
