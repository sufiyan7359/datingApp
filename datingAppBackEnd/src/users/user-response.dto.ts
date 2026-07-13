import { ApiProperty } from '@nestjs/swagger';
import { Role, User } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  twoFactorEnabled: boolean;

  @ApiProperty({ enum: Role })
  role: Role;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.createdAt = user.createdAt;
    dto.twoFactorEnabled = user.twoFactorEnabled;
    dto.role = user.role;
    return dto;
  }
}
