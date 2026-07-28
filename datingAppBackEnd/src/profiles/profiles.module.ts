import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [SubscriptionsModule, AnalyticsModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
