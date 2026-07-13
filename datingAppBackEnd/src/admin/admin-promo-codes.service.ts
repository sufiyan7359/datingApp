import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';
import { AdminPromoCodeDto } from './dto/admin-promo-code.dto';

@Injectable()
export class AdminPromoCodesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<AdminPromoCodeDto[]> {
    const promoCodes = await this.prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return promoCodes.map((p) => AdminPromoCodeDto.fromEntity(p));
  }

  async create(dto: CreatePromoCodeDto): Promise<AdminPromoCodeDto> {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.promoCode.findUnique({
      where: { code },
    });
    if (existing) {
      throw new ConflictException('A promo code with this code already exists');
    }

    const promo = await this.prisma.promoCode.create({
      data: {
        code,
        discountPercent: dto.discountPercent,
        maxRedemptions: dto.maxRedemptions,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
    return AdminPromoCodeDto.fromEntity(promo);
  }

  async update(
    id: string,
    dto: UpdatePromoCodeDto,
  ): Promise<AdminPromoCodeDto> {
    const existing = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Promo code not found');
    }
    const updated = await this.prisma.promoCode.update({
      where: { id },
      data: { isActive: dto.isActive },
    });
    return AdminPromoCodeDto.fromEntity(updated);
  }
}
