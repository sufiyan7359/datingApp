import { ApiProperty } from '@nestjs/swagger';
import { Photo, Profile, User, VerificationStatus } from '@prisma/client';

export class AdminVerificationDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ nullable: true })
  selfieUrl: string | null;

  @ApiProperty({
    nullable: true,
    description:
      'Primary profile photo, for the admin to compare against the selfie',
  })
  primaryPhotoUrl: string | null;

  @ApiProperty({ enum: VerificationStatus })
  status: VerificationStatus;

  @ApiProperty({ nullable: true })
  submittedAt: Date | null;

  @ApiProperty({ nullable: true })
  reviewedAt: Date | null;

  @ApiProperty({ nullable: true })
  note: string | null;

  static fromEntity(
    profile: Profile & {
      user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
      photos: Pick<Photo, 'url'>[];
    },
  ): AdminVerificationDto {
    const dto = new AdminVerificationDto();
    dto.userId = profile.user.id;
    dto.firstName = profile.user.firstName;
    dto.lastName = profile.user.lastName;
    dto.email = profile.user.email;
    dto.selfieUrl = profile.verificationSelfieUrl;
    dto.primaryPhotoUrl = profile.photos[0]?.url ?? null;
    dto.status = profile.verificationStatus;
    dto.submittedAt = profile.verificationSubmittedAt;
    dto.reviewedAt = profile.verificationReviewedAt;
    dto.note = profile.verificationNote;
    return dto;
  }
}
