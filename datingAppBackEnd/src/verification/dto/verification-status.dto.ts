import { ApiProperty } from '@nestjs/swagger';
import { Profile, VerificationStatus } from '@prisma/client';

export class VerificationStatusDto {
  @ApiProperty({ enum: VerificationStatus })
  status: VerificationStatus;

  @ApiProperty({ nullable: true })
  submittedAt: Date | null;

  @ApiProperty({ nullable: true })
  reviewedAt: Date | null;

  @ApiProperty({
    nullable: true,
    description: 'Set by an admin when rejecting, explaining why',
  })
  note: string | null;

  static fromEntity(profile: Profile): VerificationStatusDto {
    const dto = new VerificationStatusDto();
    dto.status = profile.verificationStatus;
    dto.submittedAt = profile.verificationSubmittedAt;
    dto.reviewedAt = profile.verificationReviewedAt;
    dto.note = profile.verificationNote;
    return dto;
  }
}
