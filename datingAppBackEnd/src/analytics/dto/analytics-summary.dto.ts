import { ApiProperty } from '@nestjs/swagger';
import { AnalyticsEventType } from '@prisma/client';

export class AnalyticsSummaryDto {
  @ApiProperty({ description: 'Size of the reporting window, in days' })
  days: number;

  @ApiProperty()
  since: Date;

  @ApiProperty({
    description:
      'Event count by type within the window, omitting zero-count types',
    example: { SIGNUP: 12, MATCH: 4 },
  })
  countByType: Partial<Record<AnalyticsEventType, number>>;
}
