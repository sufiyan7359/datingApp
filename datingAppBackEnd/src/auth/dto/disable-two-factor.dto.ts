import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class DisableTwoFactorDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  password: string;
}
