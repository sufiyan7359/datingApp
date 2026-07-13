import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { SubscriptionStatusDto } from './dto/subscription-status.dto';
import { PlanDto } from './dto/plan.dto';
import {
  PromoValidationDto,
  ValidatePromoDto,
} from './dto/promo-validation.dto';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List available Gold/Platinum plans and pricing' })
  listPlans(): PlanDto[] {
    return this.subscriptionsService.listPlans();
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "The current user's subscription tier and status" })
  getMe(@CurrentUser() user: RequestUser): Promise<SubscriptionStatusDto> {
    return this.subscriptionsService.getMe(user.userId);
  }

  @Post('promo/validate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check whether a promo code is currently usable' })
  validatePromo(@Body() dto: ValidatePromoDto): Promise<PromoValidationDto> {
    return this.subscriptionsService.validatePromo(dto.code);
  }

  @Post('subscribe')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Activate a Gold/Platinum subscription. No payment is collected yet - ' +
      'this is a placeholder entitlement grant until Stripe/Razorpay is wired in.',
  })
  subscribe(
    @CurrentUser() user: RequestUser,
    @Body() dto: SubscribeDto,
  ): Promise<SubscriptionStatusDto> {
    return this.subscriptionsService.subscribe(user.userId, dto);
  }

  @Post('cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Turn off auto-renew; the current subscription stays active until it expires',
  })
  cancel(@CurrentUser() user: RequestUser): Promise<SubscriptionStatusDto> {
    return this.subscriptionsService.cancelAutoRenew(user.userId);
  }
}
