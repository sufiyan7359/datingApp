import { ApiProperty } from '@nestjs/swagger';
import { AdminUserSummaryDto } from './admin-user-summary.dto';

export class AdminUsersPageDto {
  @ApiProperty({ type: [AdminUserSummaryDto] })
  results: AdminUserSummaryDto[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;
}
