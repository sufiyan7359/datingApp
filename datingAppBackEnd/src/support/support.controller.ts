import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { SupportService } from './support.service';
import { SendSupportMessageDto } from './dto/send-support-message.dto';
import { SupportMessageResponseDto } from './dto/support-message-response.dto';
import { SupportThreadResponseDto } from './dto/support-thread-response.dto';

@ApiTags('support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('thread')
  @ApiOperation({
    summary: "Get (or lazily create) your own support thread with the admin team",
  })
  getThread(@CurrentUser() user: RequestUser): Promise<SupportThreadResponseDto> {
    return this.supportService.getThreadForUser(user.userId);
  }

  @Post('thread/messages')
  @ApiOperation({ summary: 'Send a message to the admin team' })
  sendMessage(
    @CurrentUser() user: RequestUser,
    @Body() dto: SendSupportMessageDto,
  ): Promise<SupportMessageResponseDto> {
    return this.supportService.sendMessage(
      user.userId,
      user.userId,
      false,
      dto.content,
    );
  }

  @Post('thread/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark your support thread as read' })
  async markRead(@CurrentUser() user: RequestUser): Promise<void> {
    await this.supportService.markRead(user.userId, false);
  }
}
