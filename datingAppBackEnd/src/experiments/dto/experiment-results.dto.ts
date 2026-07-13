import { ApiProperty } from '@nestjs/swagger';
import { AnalyticsEventType } from '@prisma/client';

export class ExperimentVariantResultDto {
  @ApiProperty()
  variant: string;

  @ApiProperty()
  assignedCount: number;

  @ApiProperty({
    description:
      'Distinct users who recorded the goal event after being assigned',
  })
  convertedCount: number;

  @ApiProperty()
  conversionRate: number;
}

export class ExperimentResultsDto {
  @ApiProperty()
  key: string;

  @ApiProperty({ enum: AnalyticsEventType })
  goalEvent: AnalyticsEventType;

  @ApiProperty({ type: [ExperimentVariantResultDto] })
  results: ExperimentVariantResultDto[];
}
