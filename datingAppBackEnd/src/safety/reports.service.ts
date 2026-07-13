import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlocksService } from './blocks.service';
import { ReportUserDto } from './dto/report-user.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blocks: BlocksService,
  ) {}

  async createReport(reporterId: string, dto: ReportUserDto): Promise<void> {
    if (dto.userId === reporterId) {
      throw new BadRequestException('You cannot report yourself');
    }

    await this.prisma.report.create({
      data: {
        reporterId,
        reportedId: dto.userId,
        reason: dto.reason,
        description: dto.description,
      },
    });

    if (dto.alsoBlock) {
      await this.blocks.block(reporterId, dto.userId);
    }
  }
}
