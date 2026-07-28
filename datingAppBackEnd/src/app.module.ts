import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profiles/profiles.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { MatchingModule } from './matching/matching.module';
import { ChatModule } from './chat/chat.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SafetyModule } from './safety/safety.module';
import { AdminModule } from './admin/admin.module';
import { VerificationModule } from './verification/verification.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ExperimentsModule } from './experiments/experiments.module';
import { ContactModule } from './contact/contact.module';
import { SupportModule } from './support/support.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    ProfilesModule,
    DiscoveryModule,
    MatchingModule,
    ChatModule,
    SubscriptionsModule,
    SafetyModule,
    AdminModule,
    VerificationModule,
    NotificationsModule,
    AnalyticsModule,
    ExperimentsModule,
    ContactModule,
    SupportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
