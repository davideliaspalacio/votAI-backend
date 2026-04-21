import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { QuestionsListResponseDto } from './dto/question.response.dto';

@ApiTags('questions')
@Controller('quiz')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get('questions')
  @ApiOperation({
    summary: '10 preguntas aleatorias del test de afinidad (1 por eje)',
    description:
      'Retorna 10 preguntas seleccionadas aleatoriamente del banco (1 por eje). ' +
      'Requiere sessionId para asignar las preguntas a la sesión. ' +
      'Si se llama varias veces con el mismo sessionId, retorna las mismas preguntas.',
  })
  @ApiQuery({ name: 'sessionId', required: true, example: 'a1b2c3d4-...' })
  @ApiResponse({ status: 200, type: QuestionsListResponseDto })
  @ApiResponse({ status: 404, description: 'Sesión no encontrada' })
  async getQuestions(
    @Query('sessionId') sessionId: string,
  ): Promise<QuestionsListResponseDto> {
    return this.questionsService.getQuestionsForSession(sessionId);
  }
}
