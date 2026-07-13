import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminVerificationsQueryDto } from './dto/admin-verifications-query.dto';
import { AdminVerificationsPageDto } from './dto/admin-verifications-page.dto';
import { AdminVerificationDto } from './dto/admin-verification.dto';
import { ReviewVerificationDto } from './dto/review-verification.dto';

const PROFILE_INCLUDE = {
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  photos: { where: { isPrimary: true }, take: 1, select: { url: true } },
} as const;

@Injectable()
export class AdminVerificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: AdminVerificationsQueryDto,
  ): Promise<AdminVerificationsPageDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { verificationStatus: query.status ?? 'PENDING' } as const;

    const [profiles, total] = await Promise.all([
      this.prisma.profile.findMany({
        where,
        include: PROFILE_INCLUDE,
        orderBy: { verificationSubmittedAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.profile.count({ where }),
    ]);

    return {
      results: profiles.map((p) => AdminVerificationDto.fromEntity(p)),
      page,
      limit,
      total,
    };
  }

  async review(
    userId: string,
    dto: ReviewVerificationDto,
  ): Promise<AdminVerificationDto> {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile || !profile.verificationSelfieUrl) {
      throw new NotFoundException(
        'No verification submission found for this user',
      );
    }
    if (dto.status === 'REJECTED' && !dto.note) {
      throw new BadRequestException(
        'A note explaining the rejection is required',
      );
    }

    const updated = await this.prisma.profile.update({
      where: { userId },
      data: {
        verificationStatus: dto.status,
        verificationReviewedAt: new Date(),
        verificationNote: dto.note ?? null,
      },
      include: PROFILE_INCLUDE,
    });

    return AdminVerificationDto.fromEntity(updated);
  }
}
