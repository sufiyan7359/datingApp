import { Module } from '@nestjs/common';
import { SwipesController } from './swipes.controller';
import { SwipesService } from './swipes.service';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { SafetyModule } from '../safety/safety.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    SubscriptionsModule,
    SafetyModule,
    NotificationsModule,
    AnalyticsModule,
  ],
  controllers: [SwipesController, MatchesController],
  providers: [SwipesService, MatchesService],
})
export class MatchingModule {}
