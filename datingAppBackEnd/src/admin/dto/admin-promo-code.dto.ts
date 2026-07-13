import { ApiProperty } from '@nestjs/swagger';
import { PromoCode } from '@prisma/client';

export class AdminPromoCodeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  discountPercent: number;

  @ApiProperty({ nullable: true })
  maxRedemptions: number | null;

  @ApiProperty()
  redemptionCount: number;

  @ApiProperty({ nullable: true })
  expiresAt: Date | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(promo: PromoCode): AdminPromoCodeDto {
    const dto = new AdminPromoCodeDto();
    dto.id = promo.id;
    dto.code = promo.code;
    dto.discountPercent = promo.discountPercent;
    dto.maxRedemptions = promo.maxRedemptions;
    dto.redemptionCount = promo.redemptionCount;
    dto.expiresAt = promo.expiresAt;
    dto.isActive = promo.isActive;
    dto.createdAt = promo.createdAt;
    return dto;
  }
}
