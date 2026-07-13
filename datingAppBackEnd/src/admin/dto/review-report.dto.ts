import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportStatus } from '@prisma/client';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ReviewReportDto {
  @ApiProperty({ enum: ['REVIEWED', 'ACTION_TAKEN', 'DISMISSED'] })
  @IsIn(['REVIEWED', 'ACTION_TAKEN', 'DISMISSED'])
  status: Extract<ReportStatus, 'REVIEWED' | 'ACTION_TAKEN' | 'DISMISSED'>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;

  @ApiPropertyOptional({
    description: 'Suspend the reported user as part of this review',
  })
  @IsOptional()
  @IsBoolean()
  suspendReportedUser?: boolean;
}
