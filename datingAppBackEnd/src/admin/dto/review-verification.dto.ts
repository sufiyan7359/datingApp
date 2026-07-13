import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationStatus } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewVerificationDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  status: Extract<VerificationStatus, 'APPROVED' | 'REJECTED'>;

  @ApiPropertyOptional({
    description: 'Required when rejecting, explains why to the user',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
