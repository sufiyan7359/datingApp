import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { existsSync } from 'fs';
import { basename, join } from 'path';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  BOOST_DURATION_MINUTES,
  TIER_LIMITS,
} from '../matching/matching.constants';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PHOTOS_ROOT } from './multer.config';
import { AnalyticsService } from '../analytics/analytics.service';

const MAX_PHOTOS_PER_PROFILE = 6;
const BLUR_SIGMA = 25;

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
    private readonly analytics: AnalyticsService,
  ) {}

  async getOrCreate(userId: string) {
    const existing = await this.prisma.profile.findUnique({
      where: { userId },
      include: { photos: true },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.profile.create({
      data: { userId },
      include: { photos: true },
    });
  }

  async update(userId: string, dto: UpdateProfileDto) {
    const existing = await this.getOrCreate(userId);

    const wantsPremiumFields =
      dto.isIncognito === true ||
      dto.passportLatitude !== undefined ||
      dto.passportLongitude !== undefined;
    if (wantsPremiumFields) {
      const tier = await this.subscriptions.getCurrentTier(userId);
      if (tier === 'FREE') {
        throw new ForbiddenException(
          'Incognito mode and Passport location require a Gold or Platinum subscription',
        );
      }
    }

    const { clearPassport, ...rest } = dto;

    const updated = await this.prisma.profile.update({
      where: { userId },
      data: {
        ...rest,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        ...(clearPassport
          ? {
              passportLatitude: null,
              passportLongitude: null,
              passportCity: null,
              passportCountry: null,
            }
          : {}),
      },
      include: { photos: true },
    });

    if (dto.onboardingCompleted === true && !existing.onboardingCompleted) {
      await this.analytics.track(userId, 'ONBOARDING_COMPLETED');
    }

    return updated;
  }

  async setCoverPhoto(userId: string, url: string) {
    const profile = await this.getOrCreate(userId);
    return this.prisma.profile.update({
      where: { id: profile.id },
      data: { coverPhotoUrl: url },
    });
  }

  async addPhoto(userId: string, url: string) {
    const profile = await this.getOrCreate(userId);

    if (profile.photos.length >= MAX_PHOTOS_PER_PROFILE) {
      throw new BadRequestException(
        `You can upload at most ${MAX_PHOTOS_PER_PROFILE} photos`,
      );
    }

    return this.prisma.photo.create({
      data: {
        profileId: profile.id,
        url,
        order: profile.photos.length,
        isPrimary: profile.photos.length === 0,
      },
    });
  }

  async removePhoto(userId: string, photoId: string) {
    const profile = await this.getOrCreate(userId);
    const photo = profile.photos.find((p) => p.id === photoId);
    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    await this.prisma.photo.delete({ where: { id: photoId } });

    if (photo.isPrimary) {
      const next = await this.prisma.photo.findFirst({
        where: { profileId: profile.id },
        orderBy: { order: 'asc' },
      });
      if (next) {
        await this.prisma.photo.update({
          where: { id: next.id },
          data: { isPrimary: true },
        });
      }
    }
  }

  /**
   * Makes an existing photo the profile picture. Every place that displays
   * someone's "main" photo (discovery, matches, messages, this profile's own
   * hero) reads photos[0] after sorting by `order` - none of them check
   * `isPrimary` - so flipping just the flag left the flag and the display
   * disagreeing with each other. This also swaps `order` with whichever
   * photo currently holds order 0, so the picked photo actually becomes the
   * one everyone sees.
   */
  async setPrimaryPhoto(userId: string, photoId: string) {
    const profile = await this.getOrCreate(userId);
    const photo = profile.photos.find((p) => p.id === photoId);
    if (!photo) {
      throw new NotFoundException('Photo not found');
    }
    if (photo.isPrimary && photo.order === 0) {
      return photo;
    }

    const currentFirst = profile.photos.find((p) => p.order === 0);

    await this.prisma.$transaction([
      this.prisma.photo.updateMany({
        where: { profileId: profile.id, isPrimary: true },
        data: { isPrimary: false },
      }),
      ...(currentFirst && currentFirst.id !== photoId
        ? [
            this.prisma.photo.update({
              where: { id: currentFirst.id },
              data: { order: photo.order },
            }),
          ]
        : []),
      this.prisma.photo.update({
        where: { id: photoId },
        data: { order: 0, isPrimary: true },
      }),
    ]);

    return { ...photo, order: 0, isPrimary: true };
  }

  /**
   * Generates a real blurred image variant with sharp (not a CSS filter, so it
   * can't be undone client-side) and serves it instead of the original to
   * anyone who hasn't matched the owner yet - see photo-response.dto.ts.
   */
  async setPhotoBlur(userId: string, photoId: string, isBlurred: boolean) {
    const profile = await this.getOrCreate(userId);
    const photo = profile.photos.find((p) => p.id === photoId);
    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    if (!isBlurred) {
      return this.prisma.photo.update({
        where: { id: photoId },
        data: { isBlurred: false, blurredUrl: null },
      });
    }

    const filename = basename(photo.url);
    const inputPath = join(PHOTOS_ROOT, userId, filename);
    const blurredFilename = `blurred-${filename}`;
    const outputPath = join(PHOTOS_ROOT, userId, blurredFilename);

    if (!existsSync(inputPath)) {
      throw new NotFoundException(
        'Original photo file is missing on the server. Please delete this photo and re-upload it.',
      );
    }

    await sharp(inputPath).blur(BLUR_SIGMA).toFile(outputPath);

    return this.prisma.photo.update({
      where: { id: photoId },
      data: {
        isBlurred: true,
        blurredUrl: `/uploads/photos/${userId}/${blurredFilename}`,
      },
    });
  }

  async activateBoost(userId: string) {
    const profile = await this.getOrCreate(userId);
    const since = startOfToday();
    const tier = await this.subscriptions.getCurrentTier(userId);

    const boostsToday = await this.prisma.boostActivation.count({
      where: { profileId: profile.id, activatedAt: { gte: since } },
    });
    if (boostsToday >= TIER_LIMITS[tier].boosts) {
      throw new ForbiddenException('You have reached your daily boost limit');
    }

    const boostedUntil = new Date(Date.now() + BOOST_DURATION_MINUTES * 60_000);

    await this.prisma.$transaction([
      this.prisma.boostActivation.create({ data: { profileId: profile.id } }),
      this.prisma.profile.update({
        where: { id: profile.id },
        data: { boostedUntil },
      }),
    ]);
    await this.analytics.track(userId, 'BOOST_ACTIVATED');

    return { boostedUntil };
  }
}

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}
