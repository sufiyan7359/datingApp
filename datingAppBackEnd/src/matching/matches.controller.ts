import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { MatchesService } from './matches.service';
import { MatchDto } from './dto/match.dto';

@ApiTags('matches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  @ApiOperation({ summary: 'List everyone you have mutually matched with' })
  list(@CurrentUser() user: RequestUser): Promise<MatchDto[]> {
    return this.matchesService.listMatches(user.userId);
  }
}
