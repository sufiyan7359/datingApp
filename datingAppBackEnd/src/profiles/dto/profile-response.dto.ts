import { ApiProperty } from '@nestjs/swagger';
import {
  Gender,
  LifestyleChoice,
  Photo,
  Profile,
  RelationshipGoal,
} from '@prisma/client';
import { PhotoResponseDto } from './photo-response.dto';

export class ProfileResponseDto {
  @ApiProperty({ nullable: true, enum: Gender })
  gender: Gender | null;

  @ApiProperty({ enum: Gender, isArray: true })
  interestedIn: Gender[];

  @ApiProperty({ nullable: true })
  dateOfBirth: Date | null;

  @ApiProperty({ nullable: true })
  heightCm: number | null;

  @ApiProperty({ nullable: true })
  religion: string | null;

  @ApiProperty({ type: [String] })
  languages: string[];

  @ApiProperty({ nullable: true })
  profession: string | null;

  @ApiProperty({ nullable: true })
  education: string | null;

  @ApiProperty({ nullable: true })
  bio: string | null;

  @ApiProperty({ nullable: true })
  city: string | null;

  @ApiProperty({ nullable: true })
  country: string | null;

  @ApiProperty({ nullable: true })
  latitude: number | null;

  @ApiProperty({ nullable: true })
  longitude: number | null;

  @ApiProperty({ nullable: true, enum: LifestyleChoice })
  smoking: LifestyleChoice | null;

  @ApiProperty({ nullable: true, enum: LifestyleChoice })
  drinking: LifestyleChoice | null;

  @ApiProperty({ nullable: true, enum: LifestyleChoice })
  workout: LifestyleChoice | null;

  @ApiProperty({ nullable: true, enum: RelationshipGoal })
  relationshipGoal: RelationshipGoal | null;

  @ApiProperty({ nullable: true })
  hasKids: boolean | null;

  @ApiProperty({ nullable: true })
  wantsKids: boolean | null;

  @ApiProperty({ nullable: true })
  hasPets: boolean | null;

  @ApiProperty({ type: [String] })
  interests: string[];

  @ApiProperty()
  onboardingCompleted: boolean;

  @ApiProperty({ type: [PhotoResponseDto] })
  photos: PhotoResponseDto[];

  static fromEntity(
    profile: Profile & { photos?: Photo[] },
  ): ProfileResponseDto {
    const dto = new ProfileResponseDto();
    dto.gender = profile.gender;
    dto.interestedIn = profile.interestedIn;
    dto.dateOfBirth = profile.dateOfBirth;
    dto.heightCm = profile.heightCm;
    dto.religion = profile.religion;
    dto.languages = profile.languages;
    dto.profession = profile.profession;
    dto.education = profile.education;
    dto.bio = profile.bio;
    dto.city = profile.city;
    dto.country = profile.country;
    dto.latitude = profile.latitude;
    dto.longitude = profile.longitude;
    dto.smoking = profile.smoking;
    dto.drinking = profile.drinking;
    dto.workout = profile.workout;
    dto.relationshipGoal = profile.relationshipGoal;
    dto.hasKids = profile.hasKids;
    dto.wantsKids = profile.wantsKids;
    dto.hasPets = profile.hasPets;
    dto.interests = profile.interests;
    dto.onboardingCompleted = profile.onboardingCompleted;
    dto.photos = (profile.photos ?? [])
      .sort((a, b) => a.order - b.order)
      .map((photo) => PhotoResponseDto.fromEntity(photo));
    return dto;
  }
}
