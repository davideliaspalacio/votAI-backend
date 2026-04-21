import { ApiProperty } from '@nestjs/swagger';

export class CandidatePctDto {
  @ApiProperty({ example: 'c1' })
  candidateId!: string;

  @ApiProperty({ example: 22.4 })
  pct!: number;
}

export class RegionStatsDto {
  @ApiProperty({ example: 'andina' })
  region!: string;

  @ApiProperty({ type: [CandidatePctDto] })
  top3!: CandidatePctDto[];
}

export class AgeStatsDto {
  @ApiProperty({ example: '18-24' })
  range!: string;

  @ApiProperty({ type: [CandidatePctDto] })
  distribution!: CandidatePctDto[];
}

export class PreferenceFlowDto {
  @ApiProperty({ example: 'c1' })
  fromCandidateId!: string;

  @ApiProperty({ type: [CandidatePctDto] })
  to!: CandidatePctDto[];
}

export class AxisWeightDto {
  @ApiProperty({ example: 'economia' })
  axis!: string;

  @ApiProperty({ example: 2.7 })
  avgWeight!: number;
}

export class PolarizationDto {
  @ApiProperty({ example: 'seguridad' })
  axis!: string;

  @ApiProperty({ example: 0.85 })
  polarizationScore!: number;
}

export class PublicStatsResponseDto {
  @ApiProperty({ example: 2547 })
  total_sessions!: number;

  @ApiProperty({ example: '2026-04-21T14:30:00Z' })
  last_updated!: string;

  @ApiProperty({ type: [CandidatePctDto] })
  aggregate_affinity!: CandidatePctDto[];

  @ApiProperty({ type: [RegionStatsDto] })
  by_region!: RegionStatsDto[];

  @ApiProperty({ type: [AgeStatsDto] })
  by_age!: AgeStatsDto[];

  @ApiProperty({ type: [PreferenceFlowDto] })
  preference_vs_match!: PreferenceFlowDto[];

  @ApiProperty({ example: 43.2 })
  gap_national_pct!: number;

  @ApiProperty({ type: [AxisWeightDto] })
  decisive_axes!: AxisWeightDto[];

  @ApiProperty({ type: [PolarizationDto] })
  polarization_by_axis!: PolarizationDto[];

  @ApiProperty({ example: 18.5 })
  undecided_pct!: number;
}
