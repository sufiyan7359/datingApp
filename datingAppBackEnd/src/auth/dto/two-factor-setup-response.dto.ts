import { ApiProperty } from '@nestjs/swagger';

export class TwoFactorSetupResponseDto {
  @ApiProperty({
    description: 'otpauth:// URI, in case the user wants to enter it manually',
  })
  otpauthUrl: string;

  @ApiProperty({
    description:
      'QR code as a data:image/png;base64 URL, ready to render in an <img> tag',
  })
  qrCodeDataUrl: string;
}
