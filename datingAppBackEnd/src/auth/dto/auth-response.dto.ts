import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/user-response.dto';

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}
