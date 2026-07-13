import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { ConversationsService } from './conversations.service';
import { MessagesService } from './messages.service';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { chatAttachmentMulterOptions } from './multer.config';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'List your conversations (one per match) with last message and unread count',
  })
  list(@CurrentUser() user: RequestUser): Promise<ConversationResponseDto[]> {
    return this.conversationsService.listConversations(user.userId);
  }

  @Get(':id/messages')
  @ApiOperation({
    summary:
      'Paginated message history, newest page first, oldest-to-newest within the page',
  })
  listMessages(
    @CurrentUser() user: RequestUser,
    @Param('id') conversationId: string,
    @Query('before') before?: string,
  ): Promise<MessageResponseDto[]> {
    return this.messagesService.listMessages(
      user.userId,
      conversationId,
      before,
    );
  }

  @Get(':id/messages/search')
  @ApiOperation({ summary: 'Search message text within a conversation' })
  search(
    @CurrentUser() user: RequestUser,
    @Param('id') conversationId: string,
    @Query('q') query: string,
  ): Promise<MessageResponseDto[]> {
    if (!query?.trim()) {
      throw new BadRequestException('Query parameter "q" is required');
    }
    return this.messagesService.searchMessages(
      user.userId,
      conversationId,
      query.trim(),
    );
  }

  @Get(':id/pinned')
  @ApiOperation({ summary: 'List pinned messages in a conversation' })
  listPinned(
    @CurrentUser() user: RequestUser,
    @Param('id') conversationId: string,
  ): Promise<MessageResponseDto[]> {
    return this.messagesService.listPinned(user.userId, conversationId);
  }

  @Post(':id/messages/:messageId/pin')
  @ApiOperation({ summary: 'Pin a message' })
  pin(
    @CurrentUser() user: RequestUser,
    @Param('messageId') messageId: string,
  ): Promise<MessageResponseDto> {
    return this.messagesService.togglePin(user.userId, messageId, true);
  }

  @Delete(':id/messages/:messageId/pin')
  @ApiOperation({ summary: 'Unpin a message' })
  unpin(
    @CurrentUser() user: RequestUser,
    @Param('messageId') messageId: string,
  ): Promise<MessageResponseDto> {
    return this.messagesService.togglePin(user.userId, messageId, false);
  }

  @Post(':id/mute')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mute a conversation' })
  async mute(
    @CurrentUser() user: RequestUser,
    @Param('id') conversationId: string,
  ): Promise<void> {
    await this.conversationsService.setMuted(user.userId, conversationId, true);
  }

  @Delete(':id/mute')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unmute a conversation' })
  async unmute(
    @CurrentUser() user: RequestUser,
    @Param('id') conversationId: string,
  ): Promise<void> {
    await this.conversationsService.setMuted(
      user.userId,
      conversationId,
      false,
    );
  }

  @Post(':id/attachments')
  @ApiOperation({
    summary:
      'Upload an image or voice attachment, then send it via the sendMessage socket event',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', chatAttachmentMulterOptions))
  async uploadAttachment(
    @CurrentUser() user: RequestUser,
    @Param('id') conversationId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ url: string; type: 'IMAGE' | 'VOICE' }> {
    if (!file) {
      throw new BadRequestException('No file was provided');
    }
    await this.conversationsService.getAuthorizedConversation(
      conversationId,
      user.userId,
    );

    const url = `/uploads/chat/${user.userId}/${file.filename}`;
    const type = file.mimetype.startsWith('image/') ? 'IMAGE' : 'VOICE';
    return { url, type };
  }
}
