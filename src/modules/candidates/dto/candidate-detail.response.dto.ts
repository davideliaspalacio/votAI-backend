import { ApiProperty } from '@nestjs/swagger';

export class PositionDto {
  @ApiProperty({ example: 'Propone intervención estatal en precios...' })
  summary!: string;

  @ApiProperty({ example: 'Regularemos precios de canasta básica...' })
  quote!: string;

  @ApiProperty({ example: 23 })
  programPage?: number;
}

export class CandidateDetailDto {
  @ApiProperty({ example: 'c1' })
  id!: string;

  @ApiProperty({ example: 'maria-valencia' })
  slug!: string;

  @ApiProperty({ example: 'María Valencia' })
  name!: string;

  @ApiProperty({ example: 'Alianza Verde Esperanza' })
  party!: string;

  @ApiProperty({ example: '#22C55E' })
  color!: string;

  @ApiProperty({ example: 'Economista con maestría...' })
  bio!: string;

  @ApiProperty({ required: false })
  programPdfUrl?: string;

  @ApiProperty({
    description: 'Posiciones del candidato por eje temático',
    example: {
      economia: {
        summary: 'Propone intervención estatal...',
        quote: 'Regularemos precios...',
        programPage: 23,
      },
    },
  })
  positions!: Record<string, PositionDto>;
}

export class CandidateDetailResponseDto {
  @ApiProperty({ type: CandidateDetailDto })
  candidate!: CandidateDetailDto;
}
