import { ApiProperty } from '@nestjs/swagger';

/** Returned by POST /auth/login instead of AuthResponseDto when the account has 2FA enabled. */
export class TwoFactorChallengeDto {
  @ApiProperty({ enum: [true] })
  requiresTwoFactor: true;

  @ApiProperty({
    description:
      'Short-lived token to pass to /auth/2fa/login-verify along with the code',
  })
  challengeToken: string;
}
