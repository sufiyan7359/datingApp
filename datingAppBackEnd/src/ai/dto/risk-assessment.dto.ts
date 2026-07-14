import { ApiProperty } from '@nestjs/swagger';

export class RiskFactorDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  points: number;
}

export class RiskAssessmentDto {
  @ApiProperty({
    description:
      '0 (no signals) to 100 (many signals) - a heuristic estimate, not a verdict',
  })
  score: number;

  @ApiProperty({ type: [RiskFactorDto] })
  factors: RiskFactorDto[];
}
