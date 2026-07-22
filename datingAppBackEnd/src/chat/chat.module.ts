import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { MessagesService } from './messages.service';
import { PresenceService } from './presence.service';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { ChatGateway } from './chat.gateway';
import { SafetyModule } from '../safety/safety.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    JwtModule.register({}),
    SafetyModule,
    NotificationsModule,
    AnalyticsModule,
  ],
  controllers: [ConversationsController, CallsController],
  providers: [
    ConversationsService,
    MessagesService,
    PresenceService,
    CallsService,
    ChatGateway,
  ],
  exports: [ChatGateway],
})
export class ChatModule {}
