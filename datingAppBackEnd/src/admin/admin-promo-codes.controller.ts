import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { AdminPromoCodesService } from './admin-promo-codes.service';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';
import { AdminPromoCodeDto } from './dto/admin-promo-code.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/promo-codes')
export class AdminPromoCodesController {
  constructor(private readonly promoCodesService: AdminPromoCodesService) {}

  @Get()
  @ApiOperation({ summary: 'Admin-only: list all promo codes' })
  list(): Promise<AdminPromoCodeDto[]> {
    return this.promoCodesService.list();
  }

  @Post()
  @ApiOperation({ summary: 'Admin-only: create a promo code' })
  create(@Body() dto: CreatePromoCodeDto): Promise<AdminPromoCodeDto> {
    return this.promoCodesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin-only: activate/deactivate a promo code' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePromoCodeDto,
  ): Promise<AdminPromoCodeDto> {
    return this.promoCodesService.update(id, dto);
  }
}
