import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class TwoFactorLoginVerifyDto {
  @ApiProperty()
  @IsString()
  challengeToken: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be a 6-digit number' })
  code: string;
}
