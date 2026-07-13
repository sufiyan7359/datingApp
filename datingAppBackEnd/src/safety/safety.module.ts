import { Module } from '@nestjs/common';
import { SafetyController } from './safety.controller';
import { BlocksService } from './blocks.service';
import { ReportsService } from './reports.service';

@Module({
  controllers: [SafetyController],
  providers: [BlocksService, ReportsService],
  exports: [BlocksService],
})
export class SafetyModule {}
