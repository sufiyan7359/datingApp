import { ApiProperty } from '@nestjs/swagger';
import { DiscoveryProfileDto } from './discovery-profile.dto';

export class DiscoveryFeedDto {
  @ApiProperty({ type: [DiscoveryProfileDto] })
  results: DiscoveryProfileDto[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;
}
