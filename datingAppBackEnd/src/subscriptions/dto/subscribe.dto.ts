import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingCycle } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubscribeDto {
  @ApiProperty({ enum: ['GOLD', 'PLATINUM'] })
  @IsIn(['GOLD', 'PLATINUM'])
  tier: 'GOLD' | 'PLATINUM';

  @ApiProperty({ enum: BillingCycle })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  promoCode?: string;
}
