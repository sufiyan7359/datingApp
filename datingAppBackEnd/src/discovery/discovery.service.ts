import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { haversineDistanceKm } from '../common/utils/geo';
import { BlocksService } from '../safety/blocks.service';
import { DiscoveryQueryDto } from './dto/discovery-query.dto';
import { DiscoveryFeedDto } from './dto/discovery-feed.dto';
import { DiscoveryProfileDto } from './dto/discovery-profile.dto';

@Injectable()
export class DiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blocks: BlocksService,
  ) {}

  async getFeed(
    currentUserId: string,
    query: DiscoveryQueryDto,
  ): Promise<DiscoveryFeedDto> {
    const viewer = await this.prisma.profile.findUnique({
      where: { userId: currentUserId },
    });

    const swipedTargetIds = (
      await this.prisma.swipe.findMany({
        where: { swiperId: currentUserId, undoneAt: null },
        select: { targetId: true },
      })
    ).map((s) => s.targetId);

    const blockedIds =
      await this.blocks.blockedEitherDirectionIds(currentUserId);

    const where: Prisma.ProfileWhereInput = {
      userId: {
        not: currentUserId,
        notIn: [...swipedTargetIds, ...blockedIds],
      },
      onboardingCompleted: true,
      isIncognito: false,
      user: { isActive: true },
    };

    if (viewer?.interestedIn.length) {
      where.gender = { in: viewer.interestedIn };
    }
    if (viewer?.gender) {
      where.OR = [
        { interestedIn: { isEmpty: true } },
        { interestedIn: { has: viewer.gender } },
      ];
    }

    if (query.minAge || query.maxAge) {
      const dateOfBirth: Prisma.DateTimeFilter = {};
      if (query.minAge) {
        dateOfBirth.lte = yearsAgo(query.minAge);
      }
      if (query.maxAge) {
        dateOfBirth.gte = yearsAgo(query.maxAge + 1);
      }
      where.dateOfBirth = dateOfBirth;
    }

    if (query.minHeightCm || query.maxHeightCm) {
      where.heightCm = {
        ...(query.minHeightCm ? { gte: query.minHeightCm } : {}),
        ...(query.maxHeightCm ? { lte: query.maxHeightCm } : {}),
      };
    }

    if (query.religion) {
      where.religion = { equals: query.religion, mode: 'insensitive' };
    }
    if (query.language) {
      where.languages = { has: query.language };
    }
    if (query.education) {
      where.education = { contains: query.education, mode: 'insensitive' };
    }
    if (query.profession) {
      where.profession = { contains: query.profession, mode: 'insensitive' };
    }
    if (query.relationshipGoal) {
      where.relationshipGoal = query.relationshipGoal;
    }
    if (query.smoking) {
      where.smoking = query.smoking;
    }
    if (query.drinking) {
      where.drinking = query.drinking;
    }
    if (query.workout) {
      where.workout = query.workout;
    }
    if (query.hasKids !== undefined) {
      where.hasKids = query.hasKids;
    }
    if (query.wantsKids !== undefined) {
      where.wantsKids = query.wantsKids;
    }
    if (query.hasPets !== undefined) {
      where.hasPets = query.hasPets;
    }
    if (query.interests) {
      const interests = query.interests
        .split(',')
        .map((i) => i.trim())
        .filter((i) => i.length > 0);
      if (interests.length) {
        where.interests = { hasSome: interests };
      }
    }

    const candidates = await this.prisma.profile.findMany({
      where,
      include: { photos: true, user: { select: { firstName: true } } },
    });

    // Passport mode (Gold/Platinum) browses from a chosen location instead of
    // the viewer's real GPS coordinates - see Profile.passportLatitude/Longitude.
    const originLat = viewer?.passportLatitude ?? viewer?.latitude;
    const originLng = viewer?.passportLongitude ?? viewer?.longitude;
    const canComputeDistance = !!(originLat && originLng);

    let withDistance = candidates.map((candidate) => {
      const distanceKm =
        canComputeDistance && candidate.latitude && candidate.longitude
          ? haversineDistanceKm(
              { latitude: originLat, longitude: originLng },
              { latitude: candidate.latitude, longitude: candidate.longitude },
            )
          : null;
      return { candidate, distanceKm };
    });

    if (query.maxDistanceKm) {
      withDistance = withDistance.filter(
        (c) => c.distanceKm !== null && c.distanceKm <= query.maxDistanceKm!,
      );
    }

    const now = Date.now();
    const isBoosted = (boostedUntil: Date | null) =>
      !!boostedUntil && boostedUntil.getTime() > now;

    withDistance.sort((a, b) => {
      const boostDiff =
        Number(isBoosted(b.candidate.boostedUntil)) -
        Number(isBoosted(a.candidate.boostedUntil));
      if (boostDiff !== 0) return boostDiff;

      if (a.distanceKm !== null && b.distanceKm !== null) {
        return a.distanceKm - b.distanceKm;
      }
      if (a.distanceKm !== null) return -1;
      if (b.distanceKm !== null) return 1;
      return b.candidate.createdAt.getTime() - a.candidate.createdAt.getTime();
    });

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const total = withDistance.length;
    const pageItems = withDistance.slice((page - 1) * limit, page * limit);

    return {
      // Viewer never has a match with anyone in the discovery feed yet, so
      // photos flagged isBlurred always render blurred here (revealed=false).
      results: pageItems.map(({ candidate, distanceKm }) =>
        DiscoveryProfileDto.fromEntity(candidate, distanceKm, false),
      ),
      page,
      limit,
      total,
    };
  }
}

function yearsAgo(years: number): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date;
}
