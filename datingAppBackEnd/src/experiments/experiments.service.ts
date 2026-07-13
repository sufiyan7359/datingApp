import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { AnalyticsEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ExperimentAssignmentDto } from './dto/experiment-assignment.dto';
import { CreateExperimentDto } from './dto/create-experiment.dto';
import { UpdateExperimentDto } from './dto/update-experiment.dto';
import { ExperimentDto } from './dto/experiment.dto';
import { ExperimentResultsDto } from './dto/experiment-results.dto';

const VARIANT_CONTROL = 'A';
const VARIANT_TREATMENT = 'B';
const WITH_ASSIGNMENT_COUNT = {
  include: { _count: { select: { assignments: true } } },
} as const;

@Injectable()
export class ExperimentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Everyone not in an active experiment defaults to the control variant, so
   * callers can treat a missing/inactive/unknown key exactly like "not
   * enrolled" without a special case.
   */
  async getAssignment(
    userId: string,
    key: string,
  ): Promise<ExperimentAssignmentDto> {
    const experiment = await this.prisma.experiment.findUnique({
      where: { key },
    });
    if (!experiment || !experiment.isActive) {
      return { key, variant: VARIANT_CONTROL };
    }

    const existing = await this.prisma.experimentAssignment.findUnique({
      where: { experimentId_userId: { experimentId: experiment.id, userId } },
    });
    if (existing) {
      return { key, variant: existing.variant };
    }

    const variant = bucket(userId, key, experiment.variantBPercent);
    await this.prisma.experimentAssignment.create({
      data: { experimentId: experiment.id, userId, variant },
    });
    return { key, variant };
  }

  async list(): Promise<ExperimentDto[]> {
    const experiments = await this.prisma.experiment.findMany({
      orderBy: { createdAt: 'desc' },
      ...WITH_ASSIGNMENT_COUNT,
    });
    return experiments.map((e) => ExperimentDto.fromEntity(e));
  }

  async create(dto: CreateExperimentDto): Promise<ExperimentDto> {
    const experiment = await this.prisma.experiment.create({
      data: {
        key: dto.key,
        name: dto.name,
        variantBPercent: dto.variantBPercent ?? 50,
      },
      ...WITH_ASSIGNMENT_COUNT,
    });
    return ExperimentDto.fromEntity(experiment);
  }

  async update(key: string, dto: UpdateExperimentDto): Promise<ExperimentDto> {
    const experiment = await this.prisma.experiment
      .update({ where: { key }, data: dto, ...WITH_ASSIGNMENT_COUNT })
      .catch(() => null);
    if (!experiment) {
      throw new NotFoundException('Experiment not found');
    }
    return ExperimentDto.fromEntity(experiment);
  }

  async getResults(
    key: string,
    goalEvent: AnalyticsEventType,
  ): Promise<ExperimentResultsDto> {
    const experiment = await this.prisma.experiment.findUnique({
      where: { key },
    });
    if (!experiment) {
      throw new NotFoundException('Experiment not found');
    }

    const assignments = await this.prisma.experimentAssignment.findMany({
      where: { experimentId: experiment.id },
    });

    const results = await Promise.all(
      [VARIANT_CONTROL, VARIANT_TREATMENT].map(async (variant) => {
        const assigned = assignments.filter((a) => a.variant === variant);
        const convertedFlags = await Promise.all(
          assigned.map((a) =>
            this.prisma.analyticsEvent
              .count({
                where: {
                  userId: a.userId,
                  type: goalEvent,
                  createdAt: { gte: a.assignedAt },
                },
              })
              .then((count) => count > 0),
          ),
        );
        const convertedCount = convertedFlags.filter(Boolean).length;
        return {
          variant,
          assignedCount: assigned.length,
          convertedCount,
          conversionRate:
            assigned.length === 0 ? 0 : convertedCount / assigned.length,
        };
      }),
    );

    return { key, goalEvent, results };
  }
}

function bucket(userId: string, key: string, variantBPercent: number): string {
  const hash = createHash('sha256').update(`${key}:${userId}`).digest('hex');
  const bucketValue = parseInt(hash.slice(0, 8), 16) % 100;
  return bucketValue < variantBPercent ? VARIANT_TREATMENT : VARIANT_CONTROL;
}
