import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class BlockUserDto {
  @ApiProperty()
  @IsUUID()
  @IsString()
  userId: string;
}
