import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { PresenceService } from './presence.service';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { TypingDto } from './dto/typing.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { MessageIdDto } from './dto/message-id.dto';
import { ReactMessageDto } from './dto/react-message.dto';

interface AuthedSocket extends Socket {
  data: { userId: string };
}

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: ['http://localhost:4200'], credentials: true },
})
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  // Socket.io clears socket.rooms before the 'disconnect' event fires, so we
  // can't rely on it in handleDisconnect to know which conversation rooms to
  // notify. Track it ourselves per socket instead.
  private readonly conversationIdsBySocket = new Map<string, string[]>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
    private readonly messagesService: MessagesService,
  ) {}

  async handleConnection(client: AuthedSocket): Promise<void> {
    const token = (client.handshake.auth?.token ??
      client.handshake.query?.token) as string | undefined;
    if (!token) {
      client.disconnect(true);
      return;
    }

    let userId: string;
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        token,
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        },
      );
      userId = payload.sub;
    } catch {
      client.disconnect(true);
      return;
    }

    client.data.userId = userId;

    const conversations = await this.prisma.conversation.findMany({
      where: { match: { OR: [{ userAId: userId }, { userBId: userId }] } },
      include: { match: true },
    });

    await client.join(`user:${userId}`);
    for (const conversation of conversations) {
      await client.join(`conversation:${conversation.id}`);
    }
    this.conversationIdsBySocket.set(
      client.id,
      conversations.map((c) => c.id),
    );

    const wasOffline = this.presence.addConnection(userId, client.id);
    if (wasOffline) {
      for (const conversation of conversations) {
        this.server
          .to(`conversation:${conversation.id}`)
          .emit('presence', { userId, online: true });
      }
    }
  }

  handleDisconnect(client: AuthedSocket): void {
    const userId = client.data?.userId;
    const conversationIds = this.conversationIdsBySocket.get(client.id) ?? [];
    this.conversationIdsBySocket.delete(client.id);
    if (!userId) return;

    const nowOffline = this.presence.removeConnection(userId, client.id);
    if (nowOffline) {
      for (const conversationId of conversationIds) {
        this.server
          .to(`conversation:${conversationId}`)
          .emit('presence', { userId, online: false });
      }
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const message = await this.messagesService.sendMessage(
      client.data.userId,
      dto,
    );
    this.server
      .to(`conversation:${dto.conversationId}`)
      .emit('newMessage', message);
    return message;
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() dto: TypingDto,
  ): void {
    client.to(`conversation:${dto.conversationId}`).emit('typing', {
      conversationId: dto.conversationId,
      userId: client.data.userId,
      isTyping: dto.isTyping,
    });
  }

  @SubscribeMessage('markRead')
  async handleMarkRead(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() dto: MarkReadDto,
  ) {
    const readMessageIds = await this.messagesService.markRead(
      client.data.userId,
      dto.conversationId,
      dto.upToMessageId,
    );
    this.server.to(`conversation:${dto.conversationId}`).emit('messagesRead', {
      conversationId: dto.conversationId,
      readerId: client.data.userId,
      messageIds: readMessageIds,
    });
    return { messageIds: readMessageIds };
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() dto: MessageIdDto,
  ) {
    const { conversationId } = await this.messagesService.deleteMessage(
      client.data.userId,
      dto.messageId,
    );
    this.server
      .to(`conversation:${conversationId}`)
      .emit('messageDeleted', { messageId: dto.messageId, conversationId });
    return { messageId: dto.messageId };
  }

  @SubscribeMessage('reactToMessage')
  async handleReact(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() dto: ReactMessageDto,
  ) {
    const { conversationId, added } = await this.messagesService.reactToMessage(
      client.data.userId,
      dto.messageId,
      dto.emoji,
    );
    this.server.to(`conversation:${conversationId}`).emit('messageReaction', {
      messageId: dto.messageId,
      userId: client.data.userId,
      emoji: dto.emoji,
      added,
    });
    return { added };
  }
}
