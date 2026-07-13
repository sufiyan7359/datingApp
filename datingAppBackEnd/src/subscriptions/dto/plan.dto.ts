import { ApiProperty } from '@nestjs/swagger';
import { BillingCycle } from '@prisma/client';

export class PlanDto {
  @ApiProperty({ enum: ['GOLD', 'PLATINUM'] })
  tier: 'GOLD' | 'PLATINUM';

  @ApiProperty({ enum: BillingCycle })
  billingCycle: BillingCycle;

  @ApiProperty()
  priceCents: number;

  @ApiProperty()
  durationDays: number;
}
