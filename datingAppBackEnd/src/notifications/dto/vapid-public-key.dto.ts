import { ApiProperty } from '@nestjs/swagger';

export class VapidPublicKeyDto {
  @ApiProperty()
  publicKey: string;
}
