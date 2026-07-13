import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { TwoFactorChallengeDto } from './dto/two-factor-challenge.dto';
import { TwoFactorLoginVerifyDto } from './dto/two-factor-login-verify.dto';
import { TwoFactorCodeDto } from './dto/two-factor-code.dto';
import { TwoFactorSetupResponseDto } from './dto/two-factor-setup-response.dto';
import { DisableTwoFactorDto } from './dto/disable-two-factor.dto';
import { UserResponseDto } from '../users/user-response.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { RequestUser } from './decorators/current-user.decorator';
import { UsersService } from '../users/users.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Create a new account and receive an access/refresh token pair',
  })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Log in with email and password. If the account has 2FA enabled, this returns a challenge token instead of tokens - pass it and a code to /auth/2fa/login-verify.',
  })
  @ApiBody({ type: LoginDto })
  login(@Req() req: Request): Promise<AuthResponseDto | TwoFactorChallengeDto> {
    return this.authService.login(req.user as User);
  }

  @Post('2fa/login-verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Complete a 2FA-gated login using the challenge token and a code from the authenticator app',
  })
  verifyTwoFactorLogin(
    @Body() dto: TwoFactorLoginVerifyDto,
  ): Promise<AuthResponseDto> {
    return this.authService.verifyTwoFactorLogin(dto.challengeToken, dto.code);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Exchange a valid refresh token for a new access/refresh token pair',
  })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the currently authenticated user' })
  async me(@CurrentUser() user: RequestUser): Promise<UserResponseDto> {
    const fullUser = await this.usersService.findById(user.userId);
    return UserResponseDto.fromEntity(fullUser!);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Start enabling 2FA - generates a secret and QR code. Not active until confirmed via /auth/2fa/verify.',
  })
  setupTwoFactor(
    @CurrentUser() user: RequestUser,
  ): Promise<TwoFactorSetupResponseDto> {
    return this.authService.setupTwoFactor(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/verify')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Confirm 2FA setup with a code from the authenticator app to enable it',
  })
  async confirmTwoFactor(
    @CurrentUser() user: RequestUser,
    @Body() dto: TwoFactorCodeDto,
  ): Promise<void> {
    await this.authService.confirmTwoFactor(user.userId, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disable 2FA (requires your password)' })
  async disableTwoFactor(
    @CurrentUser() user: RequestUser,
    @Body() dto: DisableTwoFactorDto,
  ): Promise<void> {
    await this.authService.disableTwoFactor(user.userId, dto.password);
  }
}
