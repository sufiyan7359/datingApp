import { ApiProperty } from '@nestjs/swagger';
import { AdminVerificationDto } from './admin-verification.dto';

export class AdminVerificationsPageDto {
  @ApiProperty({ type: [AdminVerificationDto] })
  results: AdminVerificationDto[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;
}
