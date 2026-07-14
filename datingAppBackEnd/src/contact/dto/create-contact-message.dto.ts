import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateContactMessageDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Question about Premium' })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  subject: string;

  @ApiProperty({ example: 'Hi, I wanted to ask about...' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message: string;
}
