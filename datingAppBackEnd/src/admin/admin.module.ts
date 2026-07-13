import { Module } from '@nestjs/common';
import { AdminGuard } from './guards/admin.guard';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';
import { AdminPromoCodesController } from './admin-promo-codes.controller';
import { AdminPromoCodesService } from './admin-promo-codes.service';
import { AdminVerificationsController } from './admin-verifications.controller';
import { AdminVerificationsService } from './admin-verifications.service';

@Module({
  controllers: [
    AdminDashboardController,
    AdminUsersController,
    AdminReportsController,
    AdminPromoCodesController,
    AdminVerificationsController,
  ],
  providers: [
    AdminGuard,
    AdminDashboardService,
    AdminUsersService,
    AdminReportsService,
    AdminPromoCodesService,
    AdminVerificationsService,
  ],
})
export class AdminModule {}
