import { ApiProperty } from '@nestjs/swagger';
import {
  Gender,
  LifestyleChoice,
  Photo,
  Profile,
  RelationshipGoal,
} from '@prisma/client';
import { PhotoResponseDto } from '../../profiles/dto/photo-response.dto';

export class DiscoveryProfileDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty({ nullable: true })
  age: number | null;

  @ApiProperty({ nullable: true, enum: Gender })
  gender: Gender | null;

  @ApiProperty({ nullable: true })
  bio: string | null;

  @ApiProperty({ nullable: true })
  city: string | null;

  @ApiProperty({ nullable: true })
  country: string | null;

  @ApiProperty({ nullable: true })
  profession: string | null;

  @ApiProperty({ nullable: true })
  education: string | null;

  @ApiProperty({ nullable: true, enum: LifestyleChoice })
  smoking: LifestyleChoice | null;

  @ApiProperty({ nullable: true, enum: LifestyleChoice })
  drinking: LifestyleChoice | null;

  @ApiProperty({ nullable: true, enum: LifestyleChoice })
  workout: LifestyleChoice | null;

  @ApiProperty({ nullable: true, enum: RelationshipGoal })
  relationshipGoal: RelationshipGoal | null;

  @ApiProperty({ type: [String] })
  interests: string[];

  @ApiProperty({ type: [PhotoResponseDto] })
  photos: PhotoResponseDto[];

  @ApiProperty({
    nullable: true,
    description: 'Distance from you in kilometers, if both locations are known',
  })
  distanceKm: number | null;

  static fromEntity(
    profile: Profile & { photos: Photo[]; user: { firstName: string } },
    distanceKm: number | null,
  ): DiscoveryProfileDto {
    const dto = new DiscoveryProfileDto();
    dto.userId = profile.userId;
    dto.firstName = profile.user.firstName;
    dto.age = profile.dateOfBirth ? calculateAge(profile.dateOfBirth) : null;
    dto.gender = profile.gender;
    dto.bio = profile.bio;
    dto.city = profile.city;
    dto.country = profile.country;
    dto.profession = profile.profession;
    dto.education = profile.education;
    dto.smoking = profile.smoking;
    dto.drinking = profile.drinking;
    dto.workout = profile.workout;
    dto.relationshipGoal = profile.relationshipGoal;
    dto.interests = profile.interests;
    dto.photos = profile.photos
      .sort((a, b) => a.order - b.order)
      .map((photo) => PhotoResponseDto.fromEntity(photo));
    dto.distanceKm =
      distanceKm === null ? null : Math.round(distanceKm * 10) / 10;
    return dto;
  }
}

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
  ) {
    age--;
  }
  return age;
}
