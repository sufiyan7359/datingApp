import {
  BadRequestException,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { VerificationService } from './verification.service';
import { VerificationStatusDto } from './dto/verification-status.dto';
import { selfieMulterOptions } from './multer.config';

@ApiTags('verification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get('me')
  @ApiOperation({ summary: "Get the current user's verification status" })
  getStatus(@CurrentUser() user: RequestUser): Promise<VerificationStatusDto> {
    return this.verificationService.getStatus(user.userId);
  }

  @Post('submit')
  @ApiOperation({
    summary:
      'Submit a selfie for identity verification (JPEG/PNG/WebP, max 5MB)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('selfie', selfieMulterOptions))
  async submit(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<VerificationStatusDto> {
    if (!file) {
      throw new BadRequestException('No selfie file was provided');
    }
    const url = `/uploads/verification/${user.userId}/${file.filename}`;
    return this.verificationService.submit(user.userId, url);
  }
}
