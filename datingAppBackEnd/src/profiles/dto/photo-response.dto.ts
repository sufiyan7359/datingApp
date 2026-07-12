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

  static fromEntity(photo: Photo): PhotoResponseDto {
    const dto = new PhotoResponseDto();
    dto.id = photo.id;
    dto.url = photo.url;
    dto.order = photo.order;
    dto.isPrimary = photo.isPrimary;
    return dto;
  }
}
