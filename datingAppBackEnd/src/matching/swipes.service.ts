import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSwipeDto } from './dto/create-swipe.dto';
import { SwipeResultDto } from './dto/swipe-result.dto';
import { SwipeLimitsDto } from './dto/swipe-limits.dto';
import { MatchDto } from './dto/match.dto';
import { LikesReceivedDto } from './dto/likes-received.dto';
import { PhotoResponseDto } from '../profiles/dto/photo-response.dto';
import { TIER_LIMITS, UNLIMITED } from './matching.constants';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class SwipesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async swipe(swiperId: string, dto: CreateSwipeDto): Promise<SwipeResultDto> {
    if (dto.targetUserId === swiperId) {
      throw new BadRequestException('You cannot swipe on yourself');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: dto.targetUserId },
    });
    if (!target || !target.isActive) {
      throw new NotFoundException('Profile not found');
    }

    const existing = await this.prisma.swipe.findUnique({
      where: { swiperId_targetId: { swiperId, targetId: dto.targetUserId } },
    });
    if (existing && existing.undoneAt === null) {
      throw new BadRequestException('You already swiped on this profile');
    }

    if (dto.action !== 'PASS') {
      const limits = await this.getLimits(swiperId);
      if (dto.action === 'LIKE' && limits.likesRemaining <= 0) {
        throw new ForbiddenException('You have reached your daily like limit');
      }
      if (dto.action === 'SUPER_LIKE' && limits.superLikesRemaining <= 0) {
        throw new ForbiddenException(
          'You have reached your daily super like limit',
        );
      }
    }

    const swipe = existing
      ? await this.prisma.swipe.update({
          where: { id: existing.id },
          data: { action: dto.action, undoneAt: null, createdAt: new Date() },
        })
      : await this.prisma.swipe.create({
          data: { swiperId, targetId: dto.targetUserId, action: dto.action },
        });

    let match: MatchDto | null = null;

    if (dto.action !== 'PASS') {
      const reciprocal = await this.prisma.swipe.findFirst({
        where: {
          swiperId: dto.targetUserId,
          targetId: swiperId,
          undoneAt: null,
          action: { in: ['LIKE', 'SUPER_LIKE'] },
        },
      });

      if (reciprocal) {
        match = await this.createMatch(swiperId, dto.targetUserId);
      }
    }

    return {
      targetUserId: dto.targetUserId,
      action: swipe.action,
      isMatch: match !== null,
      match,
    };
  }

  async undoLastSwipe(userId: string): Promise<void> {
    const limits = await this.getLimits(userId);
    if (limits.undosRemaining <= 0) {
      throw new ForbiddenException('You have reached your daily undo limit');
    }

    const lastSwipe = await this.prisma.swipe.findFirst({
      where: { swiperId: userId, undoneAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!lastSwipe) {
      throw new NotFoundException('No swipe to undo');
    }

    const existingMatch = await this.prisma.match.findFirst({
      where: {
        OR: [
          { userAId: userId, userBId: lastSwipe.targetId },
          { userAId: lastSwipe.targetId, userBId: userId },
        ],
      },
    });
    if (existingMatch) {
      throw new BadRequestException(
        'You cannot undo a swipe that already resulted in a match',
      );
    }

    await this.prisma.swipe.update({
      where: { id: lastSwipe.id },
      data: { undoneAt: new Date() },
    });
  }

  async getLimits(userId: string): Promise<SwipeLimitsDto> {
    const since = startOfToday();
    const tier = await this.subscriptions.getCurrentTier(userId);
    const caps = TIER_LIMITS[tier];

    const [likesToday, superLikesToday, undosToday, boostsToday] =
      await Promise.all([
        this.prisma.swipe.count({
          where: {
            swiperId: userId,
            action: 'LIKE',
            undoneAt: null,
            createdAt: { gte: since },
          },
        }),
        this.prisma.swipe.count({
          where: {
            swiperId: userId,
            action: 'SUPER_LIKE',
            undoneAt: null,
            createdAt: { gte: since },
          },
        }),
        this.prisma.swipe.count({
          where: { swiperId: userId, undoneAt: { gte: since } },
        }),
        this.prisma.boostActivation.count({
          where: { profile: { userId }, activatedAt: { gte: since } },
        }),
      ]);

    return {
      tier,
      likesRemaining: Math.max(0, caps.likes - likesToday),
      likesUnlimited: caps.likes >= UNLIMITED,
      superLikesRemaining: Math.max(0, caps.superLikes - superLikesToday),
      superLikesUnlimited: caps.superLikes >= UNLIMITED,
      undosRemaining: Math.max(0, caps.undos - undosToday),
      undosUnlimited: caps.undos >= UNLIMITED,
      boostsRemaining: Math.max(0, caps.boosts - boostsToday),
    };
  }

  /**
   * Who liked me. Free tier only gets a count (upsell); Gold/Platinum get the
   * full list, matching how this feature works on Tinder/Bumble/Hinge.
   */
  async getLikesReceived(userId: string): Promise<LikesReceivedDto> {
    const tier = await this.subscriptions.getCurrentTier(userId);

    const [likes, matches] = await Promise.all([
      this.prisma.swipe.findMany({
        where: {
          targetId: userId,
          undoneAt: null,
          action: { in: ['LIKE', 'SUPER_LIKE'] },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.match.findMany({
        where: { OR: [{ userAId: userId }, { userBId: userId }] },
      }),
    ]);

    const matchedUserIds = new Set(
      matches.map((m) => (m.userAId === userId ? m.userBId : m.userAId)),
    );
    const pending = likes.filter((l) => !matchedUserIds.has(l.swiperId));

    if (tier === 'FREE') {
      return { count: pending.length, isPremium: false, likes: [] };
    }

    const profiles = await this.prisma.profile.findMany({
      where: { userId: { in: pending.map((l) => l.swiperId) } },
      include: { photos: true, user: { select: { firstName: true } } },
    });
    const profileByUserId = new Map(profiles.map((p) => [p.userId, p]));

    return {
      count: pending.length,
      isPremium: true,
      likes: pending.map((l) => {
        const profile = profileByUserId.get(l.swiperId);
        return {
          userId: l.swiperId,
          firstName: profile?.user.firstName ?? '',
          photos: (profile?.photos ?? [])
            .sort((a, b) => a.order - b.order)
            .map((p) => PhotoResponseDto.fromEntity(p)),
          action: l.action,
          likedAt: l.createdAt,
        };
      }),
    };
  }

  private async createMatch(
    swiperId: string,
    targetId: string,
  ): Promise<MatchDto> {
    const [userAId, userBId] = [swiperId, targetId].sort();

    const match = await this.prisma.match.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      update: {},
      create: { userAId, userBId },
    });

    await this.prisma.conversation.upsert({
      where: { matchId: match.id },
      update: {},
      create: { matchId: match.id },
    });

    const otherProfile = await this.prisma.profile.findUnique({
      where: { userId: targetId },
      include: { photos: true, user: { select: { firstName: true } } },
    });

    return {
      matchId: match.id,
      userId: targetId,
      firstName: otherProfile?.user.firstName ?? '',
      photos: (otherProfile?.photos ?? [])
        .sort((a, b) => a.order - b.order)
        .map((p) => PhotoResponseDto.fromEntity(p)),
      matchedAt: match.createdAt,
    };
  }
}

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}
