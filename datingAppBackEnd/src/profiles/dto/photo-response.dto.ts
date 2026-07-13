import { ApiProperty } from '@nestjs/swagger';
import { Photo } from '@prisma/client';

export class PhotoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  order: number;

  @ApiProperty()
  isPrimary: boolean;

  @ApiProperty({
    description: 'Whether this photo is set to blur for non-matches',
  })
  isBlurred: boolean;

  /**
   * `revealed` = the viewer has matched the photo's owner (or is the owner).
   * Defaults to true so every existing call site that only ever shows
   * already-matched people (matches list, conversations, message history)
   * keeps working without change; call sites that show not-yet-matched
   * people (discovery, who-liked-me) must pass `false` explicitly.
   */
  static fromEntity(photo: Photo, revealed = true): PhotoResponseDto {
    const dto = new PhotoResponseDto();
    dto.id = photo.id;
    dto.url =
      !revealed && photo.isBlurred && photo.blurredUrl
        ? photo.blurredUrl
        : photo.url;
    dto.order = photo.order;
    dto.isPrimary = photo.isPrimary;
    dto.isBlurred = photo.isBlurred;
    return dto;
  }
}
