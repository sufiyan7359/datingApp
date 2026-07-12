import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { DiscoveryService } from './discovery.service';
import { DiscoveryQueryDto } from './dto/discovery-query.dto';
import { DiscoveryFeedDto } from './dto/discovery-feed.dto';

@ApiTags('discovery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('feed')
  @ApiOperation({
    summary:
      'Browse other profiles, filtered and (when your location is set) sorted by distance',
  })
  getFeed(
    @CurrentUser() user: RequestUser,
    @Query() query: DiscoveryQueryDto,
  ): Promise<DiscoveryFeedDto> {
    return this.discoveryService.getFeed(user.userId, query);
  }
}
