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
import { SwipesService } from './swipes.service';
import { CreateSwipeDto } from './dto/create-swipe.dto';
import { SwipeResultDto } from './dto/swipe-result.dto';
import { SwipeLimitsDto } from './dto/swipe-limits.dto';
import { LikesReceivedDto } from './dto/likes-received.dto';

@ApiTags('swipes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('swipes')
export class SwipesController {
  constructor(private readonly swipesService: SwipesService) {}

  @Post()
  @ApiOperation({
    summary:
      'Like, pass, or super like a profile. Creates a match if the target already liked you.',
  })
  swipe(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateSwipeDto,
  ): Promise<SwipeResultDto> {
    return this.swipesService.swipe(user.userId, dto);
  }

  @Delete('last')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Undo your most recent swipe, if it has not already resulted in a match',
  })
  async undoLast(@CurrentUser() user: RequestUser): Promise<void> {
    await this.swipesService.undoLastSwipe(user.userId);
  }

  @Get('limits')
  @ApiOperation({
    summary: 'Your remaining likes/super likes/undos/boosts for today',
  })
  getLimits(@CurrentUser() user: RequestUser): Promise<SwipeLimitsDto> {
    return this.swipesService.getLimits(user.userId);
  }

  @Get('likes-received')
  @ApiOperation({
    summary:
      'Who liked you and you have not swiped back on yet. Free tier gets a count only; Gold/Platinum see full profiles.',
  })
  getLikesReceived(
    @CurrentUser() user: RequestUser,
  ): Promise<LikesReceivedDto> {
    return this.swipesService.getLikesReceived(user.userId);
  }
}
