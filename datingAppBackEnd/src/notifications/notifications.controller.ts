import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { PushSubscriptionDto } from './dto/push-subscription.dto';
import { UnsubscribeDto } from './dto/unsubscribe.dto';
import { VapidPublicKeyDto } from './dto/vapid-public-key.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('vapid-public-key')
  @ApiOperation({
    summary:
      'The VAPID public key the frontend needs to create a push subscription',
  })
  getPublicKey(): VapidPublicKeyDto {
    return { publicKey: this.notificationsService.getPublicKey() };
  }

  @Post('subscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Register a browser push subscription' })
  async subscribe(
    @CurrentUser() user: RequestUser,
    @Body() dto: PushSubscriptionDto,
  ): Promise<void> {
    await this.notificationsService.subscribe(user.userId, dto);
  }

  @Delete('subscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a browser push subscription' })
  async unsubscribe(
    @CurrentUser() user: RequestUser,
    @Body() dto: UnsubscribeDto,
  ): Promise<void> {
    await this.notificationsService.unsubscribe(user.userId, dto.endpoint);
  }
}
