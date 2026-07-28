import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchDto } from './dto/match.dto';
import { PhotoResponseDto } from '../profiles/dto/photo-response.dto';

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async listMatches(userId: string): Promise<MatchDto[]> {
    const matches = await this.prisma.match.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      orderBy: { createdAt: 'desc' },
    });

    const otherUserIds = matches.map((m) =>
      m.userAId === userId ? m.userBId : m.userAId,
    );

    const profiles = await this.prisma.profile.findMany({
      where: { userId: { in: otherUserIds } },
      include: { photos: true, user: { select: { firstName: true } } },
    });
    const profileByUserId = new Map(profiles.map((p) => [p.userId, p]));

    return matches.map((match) => {
      const otherUserId =
        match.userAId === userId ? match.userBId : match.userAId;
      const profile = profileByUserId.get(otherUserId);
      return {
        matchId: match.id,
        userId: otherUserId,
        firstName: profile?.user.firstName ?? '',
        photos: (profile?.photos ?? [])
          .sort((a, b) => a.order - b.order)
          .map((p) => PhotoResponseDto.fromEntity(p)),
        isVerified: profile?.verificationStatus === 'APPROVED',
        matchedAt: match.createdAt,
      };
    });
  }
}
