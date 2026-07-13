import { ApiProperty } from '@nestjs/swagger';
import { Experiment } from '@prisma/client';

export class ExperimentDto {
  @ApiProperty()
  key: string;

  @ApiProperty()
  name: string;

  @ApiProperty({
    description: 'Percent of traffic (0-100) bucketed into variant B',
  })
  variantBPercent: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  assignedCount: number;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(
    experiment: Experiment & { _count: { assignments: number } },
  ): ExperimentDto {
    const dto = new ExperimentDto();
    dto.key = experiment.key;
    dto.name = experiment.name;
    dto.variantBPercent = experiment.variantBPercent;
    dto.isActive = experiment.isActive;
    dto.assignedCount = experiment._count.assignments;
    dto.createdAt = experiment.createdAt;
    return dto;
  }
}
