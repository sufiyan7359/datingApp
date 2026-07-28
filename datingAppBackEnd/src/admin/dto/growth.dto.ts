import { ApiProperty } from '@nestjs/swagger';

export class GrowthPointDto {
  @ApiProperty({ description: 'YYYY-MM-DD' })
  date: string;

  @ApiProperty()
  signups: number;

  @ApiProperty()
  matches: number;

  @ApiProperty()
  messages: number;
}

export class GrowthDto {
  @ApiProperty()
  days: number;

  @ApiProperty({ type: [GrowthPointDto] })
  series: GrowthPointDto[];
}
