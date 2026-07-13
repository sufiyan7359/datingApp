import { ApiProperty } from '@nestjs/swagger';

export class ExperimentAssignmentDto {
  @ApiProperty()
  key: string;

  @ApiProperty({ description: "'A' (control) or 'B' (treatment)" })
  variant: string;
}
