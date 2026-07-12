import { ApiPropertyOptional } from '@nestjs/swagger';
import { LifestyleChoice, RelationshipGoal } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class DiscoveryQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({ minimum: 18 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(18)
  minAge?: number;

  @ApiPropertyOptional({ maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(100)
  maxAge?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minHeightCm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxHeightCm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  religion?: string;

  @ApiPropertyOptional({
    description: 'Matches profiles that speak this language',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  education?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiPropertyOptional({ enum: RelationshipGoal })
  @IsOptional()
  @IsEnum(RelationshipGoal)
  relationshipGoal?: RelationshipGoal;

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

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  hasKids?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  wantsKids?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  hasPets?: boolean;

  @ApiPropertyOptional({
    description:
      'Comma-separated list; matches profiles sharing at least one interest',
  })
  @IsOptional()
  @IsString()
  interests?: string;

  @ApiPropertyOptional({
    description:
      'Only include profiles within this many kilometers (requires your location to be set)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxDistanceKm?: number;
}
