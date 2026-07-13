import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportReason } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class ReportUserDto {
  @ApiProperty()
  @IsUUID()
  @IsString()
  userId: string;

  @ApiProperty({ enum: ReportReason })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Also block this user immediately' })
  @IsOptional()
  @IsBoolean()
  alsoBlock?: boolean;
}
