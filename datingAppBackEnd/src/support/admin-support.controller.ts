import {
  Body,
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
import { AdminGuard } from '../admin/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { SupportService } from './support.service';
import { SendSupportMessageDto } from './dto/send-support-message.dto';
import { SupportMessageResponseDto } from './dto/support-message-response.dto';
import {
  AdminSupportThreadsPageDto,
  SupportThreadResponseDto,
} from './dto/support-thread-response.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/support')
export class AdminSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('threads')
  @ApiOperation({ summary: 'Admin-only: list support threads, newest activity first' })
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<AdminSupportThreadsPageDto> {
    return this.supportService.listThreadsForAdmin(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('threads/:userId')
  @ApiOperation({
    summary: "Admin-only: get (or lazily create) a user's support thread",
  })
  getThread(
    @Param('userId') userId: string,
  ): Promise<SupportThreadResponseDto> {
    return this.supportService.getThreadForAdmin(userId);
  }

  @Post('threads/:userId/messages')
  @ApiOperation({ summary: 'Admin-only: send a message to a user' })
  sendMessage(
    @CurrentUser() admin: RequestUser,
    @Param('userId') userId: string,
    @Body() dto: SendSupportMessageDto,
  ): Promise<SupportMessageResponseDto> {
    return this.supportService.sendMessage(
      userId,
      admin.userId,
      true,
      dto.content,
    );
  }

  @Post('threads/:userId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Admin-only: mark a user's thread as read" })
  async markRead(@Param('userId') userId: string): Promise<void> {
    await this.supportService.markRead(userId, true);
  }
}
