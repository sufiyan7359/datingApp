import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { MessagesService } from './messages.service';
import { PresenceService } from './presence.service';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [JwtModule.register({})],
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    MessagesService,
    PresenceService,
    ChatGateway,
  ],
})
export class ChatModule {}
