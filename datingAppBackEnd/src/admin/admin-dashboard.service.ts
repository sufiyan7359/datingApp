import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<DashboardStatsDto> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);

    const [
      totalUsers,
      activeUsers,
      newUsersLast7Days,
      totalMatches,
      totalMessages,
      activeSubscriptions,
      pendingReports,
      totalReports,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.match.count(),
      this.prisma.message.count(),
      this.prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
        select: { priceCents: true, expiresAt: true },
      }),
      this.prisma.report.count({ where: { status: 'PENDING' } }),
      this.prisma.report.count(),
    ]);

    const stillActive = activeSubscriptions.filter(
      (s) => s.expiresAt.getTime() > Date.now(),
    );

    return {
      totalUsers,
      activeUsers,
      suspendedUsers: totalUsers - activeUsers,
      newUsersLast7Days,
      totalMatches,
      totalMessages,
      premiumSubscribers: stillActive.length,
      activeSubscriptionRevenueCents: stillActive.reduce(
        (sum, s) => sum + s.priceCents,
        0,
      ),
      pendingReports,
      totalReports,
    };
  }
}
