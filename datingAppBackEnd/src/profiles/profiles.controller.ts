import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { PhotoResponseDto } from './dto/photo-response.dto';
import { SetPhotoBlurDto } from './dto/set-photo-blur.dto';
import { coverPhotoMulterOptions, photoMulterOptions } from './multer.config';

@ApiTags('profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  @ApiOperation({
    summary:
      "Return the current user's profile, creating an empty one if none exists",
  })
  async getMyProfile(
    @CurrentUser() user: RequestUser,
  ): Promise<ProfileResponseDto> {
    const profile = await this.profilesService.getOrCreate(user.userId);
    return ProfileResponseDto.fromEntity(profile);
  }

  @Patch('me')
  @ApiOperation({ summary: "Update fields on the current user's profile" })
  async updateMyProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const profile = await this.profilesService.update(user.userId, dto);
    return ProfileResponseDto.fromEntity(profile);
  }

  @Post('me/cover-photo')
  @ApiOperation({
    summary: 'Upload/replace your profile cover photo (JPEG/PNG/WebP, max 5MB)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo', coverPhotoMulterOptions))
  async uploadCoverPhoto(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ProfileResponseDto> {
    if (!file) {
      throw new BadRequestException('No photo file was provided');
    }
    const url = `/uploads/covers/${user.userId}/${file.filename}`;
    const profile = await this.profilesService.setCoverPhoto(
      user.userId,
      url,
    );
    return ProfileResponseDto.fromEntity(profile);
  }

  @Post('me/photos')
  @ApiOperation({
    summary: 'Upload a profile photo (JPEG/PNG/WebP, max 5MB, up to 6 photos)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo', photoMulterOptions))
  async uploadPhoto(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<PhotoResponseDto> {
    if (!file) {
      throw new BadRequestException('No photo file was provided');
    }
    const url = `/uploads/photos/${user.userId}/${file.filename}`;
    const photo = await this.profilesService.addPhoto(user.userId, url);
    return PhotoResponseDto.fromEntity(photo);
  }

  @Delete('me/photos/:id')
  @ApiOperation({ summary: 'Delete a profile photo' })
  async deletePhoto(
    @CurrentUser() user: RequestUser,
    @Param('id') photoId: string,
  ): Promise<void> {
    await this.profilesService.removePhoto(user.userId, photoId);
  }

  @Patch('me/photos/:id/primary')
  @ApiOperation({ summary: 'Set a photo as your primary profile picture' })
  async setPrimaryPhoto(
    @CurrentUser() user: RequestUser,
    @Param('id') photoId: string,
  ): Promise<PhotoResponseDto> {
    const photo = await this.profilesService.setPrimaryPhoto(
      user.userId,
      photoId,
    );
    return PhotoResponseDto.fromEntity(photo);
  }

  @Patch('me/photos/:id/blur')
  @ApiOperation({
    summary:
      'Blur (or unblur) a photo. Blurred photos show a real server-generated blurred image to anyone who has not matched you yet.',
  })
  async setPhotoBlur(
    @CurrentUser() user: RequestUser,
    @Param('id') photoId: string,
    @Body() dto: SetPhotoBlurDto,
  ): Promise<PhotoResponseDto> {
    const photo = await this.profilesService.setPhotoBlur(
      user.userId,
      photoId,
      dto.isBlurred,
    );
    return PhotoResponseDto.fromEntity(photo);
  }

  @Post('me/boost')
  @ApiOperation({
    summary: 'Temporarily boost your profile to the top of discovery feeds',
  })
  activateBoost(
    @CurrentUser() user: RequestUser,
  ): Promise<{ boostedUntil: Date }> {
    return this.profilesService.activateBoost(user.userId);
  }
}
