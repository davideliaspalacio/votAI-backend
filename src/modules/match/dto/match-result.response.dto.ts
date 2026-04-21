import { ApiProperty } from '@nestjs/swagger';

export class AxisResultDto {
  @ApiProperty({ example: 'Economía' })
  axis!: string;

  @ApiProperty({ example: 'Favorece intervención estatal moderada' })
  userStance!: string;

  @ApiProperty({ example: 'Propone control de precios de canasta básica' })
  candidateStance!: string;

  @ApiProperty({ example: 'Regularemos precios de canasta básica...' })
  quote!: string;

  @ApiProperty({ example: 23, required: false })
  programPage?: number;
}

export class CandidateResultDto {
  @ApiProperty({ example: 'c1' })
  candidateId!: string;

  @ApiProperty({ example: 82 })
  score!: number;

  @ApiProperty({ example: 'Alta afinidad en ambiente, política social...' })
  summary!: string;

  @ApiProperty({ type: [AxisResultDto] })
  byAxis!: AxisResultDto[];
}

export class MatchResultResponseDto {
  @ApiProperty({ example: 'done' })
  status!: string;

  @ApiProperty({ example: 'c3' })
  initial_preference!: string;

  @ApiProperty({ type: [CandidateResultDto] })
  results!: CandidateResultDto[];

  @ApiProperty({ example: false })
  preference_match!: boolean;
}
