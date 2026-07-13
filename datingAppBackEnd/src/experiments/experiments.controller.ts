import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { ExperimentsService } from './experiments.service';
import { ExperimentAssignmentDto } from './dto/experiment-assignment.dto';

@ApiTags('experiments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('experiments')
export class ExperimentsController {
  constructor(private readonly experimentsService: ExperimentsService) {}

  @Get(':key/assignment')
  @ApiOperation({
    summary:
      "Get (and assign, on first call) the current user's A/B test variant for a given experiment key",
  })
  getAssignment(
    @CurrentUser() user: RequestUser,
    @Param('key') key: string,
  ): Promise<ExperimentAssignmentDto> {
    return this.experimentsService.getAssignment(user.userId, key);
  }
}
