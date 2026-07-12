import { ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, LifestyleChoice, RelationshipGoal } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ enum: Gender, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(Gender, { each: true })
  interestedIn?: Gender[];

  @ApiPropertyOptional({ example: '1998-05-20' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ minimum: 100, maximum: 250 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(250)
  heightCm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  religion?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  profession?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  education?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ enum: LifestyleChoice })
  @IsOptional()
  @IsEnum(LifestyleChoice)
  smoking?: LifestyleChoice;

  @ApiPropertyOptional({ enum: LifestyleChoice })
  @IsOptional()
  @IsEnum(LifestyleChoice)
  drinking?: LifestyleChoice;

  @ApiPropertyOptional({ enum: LifestyleChoice })
  @IsOptional()
  @IsEnum(LifestyleChoice)
  workout?: LifestyleChoice;

  @ApiPropertyOptional({ enum: RelationshipGoal })
  @IsOptional()
  @IsEnum(RelationshipGoal)
  relationshipGoal?: RelationshipGoal;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasKids?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  wantsKids?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasPets?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional({
    description:
      'Marks onboarding as finished once the user completes the wizard',
  })
  @IsOptional()
  @IsBoolean()
  onboardingCompleted?: boolean;
}
