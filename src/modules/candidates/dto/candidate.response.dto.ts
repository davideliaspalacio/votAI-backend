import { ApiProperty } from '@nestjs/swagger';

export class CandidateResponseDto {
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

  @ApiProperty({ example: 'Economista con maestría en políticas públicas...' })
  bio!: string;

  @ApiProperty({
    example: 'https://storage.votoloco.com/programs/maria-valencia.pdf',
    required: false,
  })
  programPdfUrl?: string;
}

export class CandidatesListResponseDto {
  @ApiProperty({ type: [CandidateResponseDto] })
  candidates!: CandidateResponseDto[];
}
