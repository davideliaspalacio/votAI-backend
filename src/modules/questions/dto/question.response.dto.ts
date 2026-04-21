import { ApiProperty } from '@nestjs/swagger';

export class QuestionResponseDto {
  @ApiProperty({ example: 'q1' })
  id!: string;

  @ApiProperty({
    example:
      'El Estado debería controlar los precios de los alimentos básicos...',
  })
  text!: string;

  @ApiProperty({ example: 'economia' })
  axis!: string;

  @ApiProperty({
    example: 'Colombia enfrenta una inflación acumulada...',
    required: false,
  })
  context?: string;
}

export class QuestionsListResponseDto {
  @ApiProperty({ type: [QuestionResponseDto] })
  questions!: QuestionResponseDto[];
}
