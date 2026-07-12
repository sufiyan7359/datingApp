import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  BOOST_DURATION_MINUTES,
  FREE_DAILY_BOOSTS,
} from '../matching/matching.constants';

const MAX_PHOTOS_PER_PROFILE = 6;

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

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
    await this.getOrCreate(userId);

    return this.prisma.profile.update({
      where: { userId },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
      include: { photos: true },
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

  async activateBoost(userId: string) {
    const profile = await this.getOrCreate(userId);
    const since = startOfToday();

    const boostsToday = await this.prisma.boostActivation.count({
      where: { profileId: profile.id, activatedAt: { gte: since } },
    });
    if (boostsToday >= FREE_DAILY_BOOSTS) {
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

    return { boostedUntil };
  }
}

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}
