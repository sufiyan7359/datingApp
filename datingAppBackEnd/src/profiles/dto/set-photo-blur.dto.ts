import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetPhotoBlurDto {
  @ApiProperty({
    description:
      'Blur this photo (server-generated, not a CSS filter) until the viewer matches you',
  })
  @IsBoolean()
  isBlurred: boolean;
}
