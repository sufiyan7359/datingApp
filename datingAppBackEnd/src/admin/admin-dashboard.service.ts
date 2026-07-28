import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { GrowthDto } from './dto/growth.dto';

interface GrowthRow {
  date: Date;
  signups: bigint;
  matches: bigint;
  messages: bigint;
}

const MIN_GROWTH_DAYS = 7;
const MAX_GROWTH_DAYS = 90;

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
      pendingVerifications,
      verifiedUsers,
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
      this.prisma.profile.count({ where: { verificationStatus: 'PENDING' } }),
      this.prisma.profile.count({ where: { verificationStatus: 'APPROVED' } }),
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
      pendingVerifications,
      verifiedUsers,
    };
  }

  async getGrowth(days: number): Promise<GrowthDto> {
    const clampedDays = Math.min(Math.max(days, MIN_GROWTH_DAYS), MAX_GROWTH_DAYS);

    // One query, three independently-scaled daily counts (signups/matches/
    // messages) - each is rendered as its own small-multiple chart on the
    // admin dashboard rather than one dual-axis chart, since the three
    // metrics differ by orders of magnitude.
    const rows = await this.prisma.$queryRaw<GrowthRow[]>(Prisma.sql`
      SELECT
        d::date AS date,
        COALESCE(u.count, 0) AS signups,
        COALESCE(m.count, 0) AS matches,
        COALESCE(msg.count, 0) AS messages
      FROM generate_series(
        CURRENT_DATE - (${clampedDays}::int - 1) * INTERVAL '1 day',
        CURRENT_DATE,
        INTERVAL '1 day'
      ) AS d
      LEFT JOIN (
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
        FROM users GROUP BY day
      ) u ON u.day = d
      LEFT JOIN (
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
        FROM matches GROUP BY day
      ) m ON m.day = d
      LEFT JOIN (
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
        FROM messages GROUP BY day
      ) msg ON msg.day = d
      ORDER BY d;
    `);

    return {
      days: clampedDays,
      series: rows.map((row) => ({
        date: row.date.toISOString().slice(0, 10),
        signups: Number(row.signups),
        matches: Number(row.matches),
        messages: Number(row.messages),
      })),
    };
  }
}
