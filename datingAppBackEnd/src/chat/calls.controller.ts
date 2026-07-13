import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { CallsService } from './calls.service';
import { CallResponseDto } from './dto/call-response.dto';

@ApiTags('calls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Get()
  @ApiOperation({
    summary: 'Your call history (voice and video), most recent first',
  })
  list(@CurrentUser() user: RequestUser): Promise<CallResponseDto[]> {
    return this.callsService.listCalls(user.userId);
  }
}
