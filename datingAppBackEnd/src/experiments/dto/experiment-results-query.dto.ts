import { ApiProperty } from '@nestjs/swagger';
import { AnalyticsEventType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ExperimentResultsQueryDto {
  @ApiProperty({ enum: AnalyticsEventType })
  @IsEnum(AnalyticsEventType)
  goalEvent: AnalyticsEventType;
}
