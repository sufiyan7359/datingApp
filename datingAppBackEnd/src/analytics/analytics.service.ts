import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsEventType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsSummaryDto } from './dto/analytics-summary.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Best-effort, like NotificationsService.notify: recording an analytics
   * event should never be able to break the action (swipe, login, purchase,
   * ...) it's attached to.
   */
  async track(
    userId: string,
    type: AnalyticsEventType,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          userId,
          type,
          metadata: metadata as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to record analytics event ${type}: ${(err as Error).message}`,
      );
    }
  }

  async getSummary(days: number): Promise<AnalyticsSummaryDto> {
    const since = new Date(Date.now() - days * 86_400_000);
    const counts = await this.prisma.analyticsEvent.groupBy({
      by: ['type'],
      where: { createdAt: { gte: since } },
      _count: true,
    });
    const countByType = Object.fromEntries(
      counts.map((c) => [c.type, c._count]),
    ) as Partial<Record<AnalyticsEventType, number>>;

    return { days, since, countByType };
  }
}
