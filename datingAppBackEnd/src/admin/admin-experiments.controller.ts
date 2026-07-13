import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { ExperimentsService } from '../experiments/experiments.service';
import { ExperimentDto } from '../experiments/dto/experiment.dto';
import { CreateExperimentDto } from '../experiments/dto/create-experiment.dto';
import { UpdateExperimentDto } from '../experiments/dto/update-experiment.dto';
import { ExperimentResultsDto } from '../experiments/dto/experiment-results.dto';
import { ExperimentResultsQueryDto } from '../experiments/dto/experiment-results-query.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/experiments')
export class AdminExperimentsController {
  constructor(private readonly experimentsService: ExperimentsService) {}

  @Get()
  @ApiOperation({ summary: 'Admin-only: list A/B test experiments' })
  list(): Promise<ExperimentDto[]> {
    return this.experimentsService.list();
  }

  @Post()
  @ApiOperation({ summary: 'Admin-only: create an A/B test experiment' })
  create(@Body() dto: CreateExperimentDto): Promise<ExperimentDto> {
    return this.experimentsService.create(dto);
  }

  @Patch(':key')
  @ApiOperation({
    summary: "Admin-only: update an experiment's traffic split or active state",
  })
  update(
    @Param('key') key: string,
    @Body() dto: UpdateExperimentDto,
  ): Promise<ExperimentDto> {
    return this.experimentsService.update(key, dto);
  }

  @Get(':key/results')
  @ApiOperation({
    summary:
      'Admin-only: per-variant assignment and conversion counts against a goal event',
  })
  getResults(
    @Param('key') key: string,
    @Query() query: ExperimentResultsQueryDto,
  ): Promise<ExperimentResultsDto> {
    return this.experimentsService.getResults(key, query.goalEvent);
  }
}
