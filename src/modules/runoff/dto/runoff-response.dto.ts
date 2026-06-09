import { ApiProperty } from '@nestjs/swagger';

export class RunoffSessionResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  sessionId!: string;
}

export class RunoffQuestionOptionDto {
  @ApiProperty({ example: 'El Estado debe fijar los precios de la canasta básica' })
  label!: string;

  @ApiProperty({ example: 1 })
  value!: number;
}

export class RunoffQuestionResponseDto {
  @ApiProperty({ example: 'q1' })
  id!: string;

  @ApiProperty({ example: 'El Estado debería controlar los precios...' })
  text!: string;

  @ApiProperty({ example: 'economia' })
  axis!: string;

  @ApiProperty({ example: 'Colombia enfrenta una inflación...', required: false })
  context?: string;

  @ApiProperty({ type: [RunoffQuestionOptionDto], required: false })
  options?: RunoffQuestionOptionDto[];
}

export class RunoffQuestionsListResponseDto {
  @ApiProperty({ type: [RunoffQuestionResponseDto] })
  questions!: RunoffQuestionResponseDto[];
}

export class RunoffMatchStatusResponseDto {
  @ApiProperty({ example: 'processing', enum: ['processing', 'done'] })
  status!: string;
}

export class RunoffAxisResultDto {
  @ApiProperty({ example: 'economia' })
  axis!: string;

  @ApiProperty({ example: 'Favorece intervención estatal moderada' })
  userStance!: string;

  @ApiProperty({ example: 'Propone control de precios de canasta básica' })
  candidateStance!: string;

  @ApiProperty({ example: 'La economía debe estar al servicio de la gente...' })
  quote!: string;

  @ApiProperty({ example: 15, required: false })
  programPage?: number;
}

export class RunoffCandidateResultDto {
  @ApiProperty({ example: 'c1' })
  candidateId!: string;

  @ApiProperty({ example: 82 })
  score!: number;

  @ApiProperty({ example: 'Alta afinidad en ambiente, política social...' })
  summary!: string;

  @ApiProperty({ type: [RunoffAxisResultDto] })
  byAxis!: RunoffAxisResultDto[];
}

export class RunoffMatchResultResponseDto {
  @ApiProperty({ example: 'done' })
  status!: string;

  @ApiProperty({ example: 'c1' })
  runoff_intention!: string;

  @ApiProperty({ example: 'c3' })
  first_round_vote!: string;

  @ApiProperty({ type: [RunoffCandidateResultDto] })
  results!: RunoffCandidateResultDto[];

  @ApiProperty({ example: false })
  preference_match!: boolean;

  @ApiProperty({ example: false })
  ai_enriched!: boolean;
}
