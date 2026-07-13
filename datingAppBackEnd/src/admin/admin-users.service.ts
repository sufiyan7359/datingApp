import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SubscriptionTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { AdminUsersPageDto } from './dto/admin-users-page.dto';
import { AdminUserSummaryDto } from './dto/admin-user-summary.dto';
import { AdminUserDetailDto } from './dto/admin-user-detail.dto';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(query: AdminUsersQueryDto): Promise<AdminUsersPageDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.UserWhereInput = {};
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          profile: {
            select: { onboardingCompleted: true, verificationStatus: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const userIds = users.map((u) => u.id);
    const [activeSubs, reportCounts] = await Promise.all([
      this.prisma.subscription.findMany({
        where: { userId: { in: userIds }, status: 'ACTIVE' },
      }),
      this.prisma.report.groupBy({
        by: ['reportedId'],
        where: { reportedId: { in: userIds } },
        _count: true,
      }),
    ]);
    const tierByUserId = new Map<string, SubscriptionTier>();
    for (const sub of activeSubs) {
      if (sub.expiresAt.getTime() > Date.now()) {
        tierByUserId.set(sub.userId, sub.tier);
      }
    }
    const reportCountByUserId = new Map(
      reportCounts.map((r) => [r.reportedId, r._count]),
    );

    return {
      results: users.map((user) =>
        AdminUserSummaryDto.fromEntity(
          user,
          tierByUserId.get(user.id) ?? 'FREE',
          reportCountByUserId.get(user.id) ?? 0,
        ),
      ),
      page,
      limit,
      total,
    };
  }

  async getUserDetail(id: string): Promise<AdminUserDetailDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: {
          select: { onboardingCompleted: true, verificationStatus: true },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [
      activeSub,
      reportsReceivedCount,
      reportsMadeCount,
      matchesCount,
      messagesSentCount,
    ] = await Promise.all([
      this.prisma.subscription.findFirst({
        where: { userId: id, status: 'ACTIVE' },
        orderBy: { expiresAt: 'desc' },
      }),
      this.prisma.report.count({ where: { reportedId: id } }),
      this.prisma.report.count({ where: { reporterId: id } }),
      this.prisma.match.count({
        where: { OR: [{ userAId: id }, { userBId: id }] },
      }),
      this.prisma.message.count({ where: { senderId: id } }),
    ]);

    const tier: SubscriptionTier =
      activeSub && activeSub.expiresAt.getTime() > Date.now()
        ? activeSub.tier
        : 'FREE';

    const summary = AdminUserSummaryDto.fromEntity(
      user,
      tier,
      reportsReceivedCount,
    );
    return {
      ...summary,
      matchesCount,
      messagesSentCount,
      reportsMadeCount,
    };
  }

  async setActive(
    id: string,
    isActive: boolean,
    adminUserId: string,
  ): Promise<void> {
    if (id === adminUserId && !isActive) {
      throw new BadRequestException('You cannot suspend your own account');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role === 'ADMIN' && !isActive) {
      throw new ForbiddenException('Cannot suspend another admin');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { isActive } }),
      ...(!isActive
        ? [
            this.prisma.refreshToken.updateMany({
              where: { userId: id, revokedAt: null },
              data: { revokedAt: new Date() },
            }),
          ]
        : []),
    ]);
  }
}
