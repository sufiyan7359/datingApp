import { ApiProperty } from '@nestjs/swagger';

export class BlockedUserDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  blockedAt: Date;
}
