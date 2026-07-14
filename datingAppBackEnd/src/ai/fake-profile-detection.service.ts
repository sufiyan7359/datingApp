import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskAssessmentDto, RiskFactorDto } from './dto/risk-assessment.dto';

const RAPID_SWIPE_WINDOW_HOURS = 24;
const RAPID_SWIPE_THRESHOLD = 100;

/**
 * Heuristic (not ML/LLM) fake-profile signal scoring for admin moderation.
 * Every factor is a plain, explainable rule over data we already have -
 * there's no model here, just weighted checks. Meant as a triage aid for
 * admins reviewing a specific account (see AdminUsersController), not an
 * automatic ban mechanism.
 */
@Injectable()
export class FakeProfileDetectionService {
  constructor(private readonly prisma: PrismaService) {}

  async assess(userId: string): Promise<RiskAssessmentDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: { include: { photos: true } } },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [reportsReceived, rapidLikeCount] = await Promise.all([
      this.prisma.report.count({ where: { reportedId: userId } }),
      this.prisma.swipe.count({
        where: {
          swiperId: userId,
          action: { in: ['LIKE', 'SUPER_LIKE'] },
          createdAt: {
            lte: new Date(
              user.createdAt.getTime() +
                RAPID_SWIPE_WINDOW_HOURS * 60 * 60 * 1000,
            ),
          },
        },
      }),
    ]);

    const factors: RiskFactorDto[] = [];
    const profile = user.profile;

    if (!profile || profile.photos.length === 0) {
      factors.push({
        code: 'NO_PHOTOS',
        description: 'Profile has no photos',
        points: 30,
      });
    }

    if (!profile?.bio || profile.bio.trim().length < 10) {
      factors.push({
        code: 'MISSING_BIO',
        description: 'Bio is missing or very short',
        points: 15,
      });
    }

    const missingCore = [
      !profile?.gender && 'gender',
      !profile?.dateOfBirth && 'date of birth',
      !profile?.interestedIn?.length && 'who they are interested in',
    ].filter(Boolean) as string[];
    if (missingCore.length > 0) {
      factors.push({
        code: 'INCOMPLETE_PROFILE',
        description: `Missing ${missingCore.join(', ')}`,
        points: 8 * missingCore.length,
      });
    }

    if (reportsReceived >= 2) {
      factors.push({
        code: 'MULTIPLE_REPORTS',
        description: `Reported by ${reportsReceived} different users`,
        points: 25,
      });
    } else if (reportsReceived === 1) {
      factors.push({
        code: 'REPORTED',
        description: 'Reported by another user',
        points: 10,
      });
    }

    if (rapidLikeCount > RAPID_SWIPE_THRESHOLD) {
      factors.push({
        code: 'RAPID_SWIPE_VELOCITY',
        description: `Liked/super-liked ${rapidLikeCount} profiles within ${RAPID_SWIPE_WINDOW_HOURS}h of joining`,
        points: 20,
      });
    }

    const score = Math.min(
      100,
      factors.reduce((sum, f) => sum + f.points, 0),
    );

    return { score, factors };
  }
}
