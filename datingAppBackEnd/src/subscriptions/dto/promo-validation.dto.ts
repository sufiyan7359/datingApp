import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class ValidatePromoDto {
  @ApiProperty()
  @IsString()
  @MaxLength(32)
  code: string;
}

export class PromoValidationDto {
  @ApiProperty()
  valid: boolean;

  @ApiProperty()
  discountPercent: number;
}
