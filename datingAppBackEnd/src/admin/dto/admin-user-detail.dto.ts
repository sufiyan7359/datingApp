import { ApiProperty } from '@nestjs/swagger';
import { AdminUserSummaryDto } from './admin-user-summary.dto';

export class AdminUserDetailDto extends AdminUserSummaryDto {
  @ApiProperty()
  matchesCount: number;

  @ApiProperty()
  messagesSentCount: number;

  @ApiProperty()
  reportsMadeCount: number;
}
