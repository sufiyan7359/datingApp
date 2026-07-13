import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateExperimentDto {
  @ApiProperty({
    description:
      'Stable identifier the frontend requests by, e.g. premium_cta_copy',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'key must be lowercase letters, numbers, and underscores only',
  })
  key: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, default: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  variantBPercent?: number;
}
