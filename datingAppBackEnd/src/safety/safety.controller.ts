import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { BlocksService } from './blocks.service';
import { ReportsService } from './reports.service';
import { BlockUserDto } from './dto/block-user.dto';
import { BlockedUserDto } from './dto/blocked-user.dto';
import { ReportUserDto } from './dto/report-user.dto';

@ApiTags('safety')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('safety')
export class SafetyController {
  constructor(
    private readonly blocksService: BlocksService,
    private readonly reportsService: ReportsService,
  ) {}

  @Post('block')
  @ApiOperation({
    summary:
      'Block a user - hides them from discovery, matches and messaging in both directions',
  })
  async block(
    @CurrentUser() user: RequestUser,
    @Body() dto: BlockUserDto,
  ): Promise<void> {
    await this.blocksService.block(user.userId, dto.userId);
  }

  @Delete('block/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unblock a user' })
  async unblock(
    @CurrentUser() user: RequestUser,
    @Param('userId') targetUserId: string,
  ): Promise<void> {
    await this.blocksService.unblock(user.userId, targetUserId);
  }

  @Get('blocked')
  @ApiOperation({ summary: 'List everyone you have blocked' })
  listBlocked(@CurrentUser() user: RequestUser): Promise<BlockedUserDto[]> {
    return this.blocksService.listBlocked(user.userId);
  }

  @Post('report')
  @ApiOperation({ summary: 'Report a user for review' })
  async report(
    @CurrentUser() user: RequestUser,
    @Body() dto: ReportUserDto,
  ): Promise<void> {
    await this.reportsService.createReport(user.userId, dto);
  }
}
