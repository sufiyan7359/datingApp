import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationStatusDto } from './dto/verification-status.dto';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  async getStatus(userId: string): Promise<VerificationStatusDto> {
    const profile = await this.getOrCreate(userId);
    return VerificationStatusDto.fromEntity(profile);
  }

  async submit(
    userId: string,
    selfieUrl: string,
  ): Promise<VerificationStatusDto> {
    const profile = await this.getOrCreate(userId);

    if (profile.verificationStatus === 'APPROVED') {
      throw new BadRequestException('You are already verified');
    }
    if (profile.verificationStatus === 'PENDING') {
      throw new BadRequestException(
        'Your verification request is already pending review',
      );
    }

    const photoCount = await this.prisma.photo.count({
      where: { profileId: profile.id },
    });
    if (photoCount === 0) {
      throw new BadRequestException(
        'Upload at least one profile photo before requesting verification',
      );
    }

    const updated = await this.prisma.profile.update({
      where: { userId },
      data: {
        verificationStatus: 'PENDING',
        verificationSelfieUrl: selfieUrl,
        verificationSubmittedAt: new Date(),
        verificationReviewedAt: null,
        verificationNote: null,
      },
    });
    await this.analytics.track(userId, 'VERIFICATION_SUBMITTED');
    return VerificationStatusDto.fromEntity(updated);
  }

  private async getOrCreate(userId: string) {
    const existing = await this.prisma.profile.findUnique({
      where: { userId },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.profile.create({ data: { userId } });
  }
}
