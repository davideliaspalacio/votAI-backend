import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RunoffService } from './runoff.service';
import { StartRunoffSessionDto } from './dto/start-runoff-session.dto';
import { SubmitRunoffMatchDto } from './dto/submit-runoff-match.dto';
import {
  RunoffSessionResponseDto,
  RunoffQuestionsListResponseDto,
  RunoffMatchStatusResponseDto,
  RunoffMatchResultResponseDto,
} from './dto/runoff-response.dto';

@ApiTags('runoff')
@Controller('runoff')
export class RunoffController {
  constructor(private readonly runoffService: RunoffService) {}

  @Post('session/start')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Inicia una sesión anónima del test de afinidad de segunda vuelta',
  })
  @ApiResponse({ status: 201, type: RunoffSessionResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async start(
    @Body() dto: StartRunoffSessionDto,
  ): Promise<RunoffSessionResponseDto> {
    return this.runoffService.startSession(dto);
  }

  @Get('questions')
  @ApiOperation({
    summary: '10 preguntas del test de segunda vuelta (1 por eje)',
    description:
      'Retorna 10 preguntas (1 por eje) asignadas a la sesión. ' +
      'Requiere sessionId. Idempotente: repite las mismas preguntas para la misma sesión.',
  })
  @ApiQuery({ name: 'sessionId', required: true, example: 'a1b2c3d4-...' })
  @ApiResponse({ status: 200, type: RunoffQuestionsListResponseDto })
  @ApiResponse({ status: 404, description: 'Sesión no encontrada' })
  async getQuestions(
    @Query('sessionId') sessionId: string,
  ): Promise<RunoffQuestionsListResponseDto> {
    return this.runoffService.getQuestionsForSession(sessionId);
  }

  @Post('match')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Envía respuestas y dispara el cálculo de afinidad (Cepeda vs Abelardo)',
  })
  @ApiResponse({ status: 202, type: RunoffMatchStatusResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Sesión no encontrada' })
  async submit(
    @Body() dto: SubmitRunoffMatchDto,
  ): Promise<RunoffMatchStatusResponseDto> {
    return this.runoffService.submit(dto);
  }

  @Get('match/:sessionId')
  @ApiOperation({ summary: 'Consulta estado/resultado del match de segunda vuelta' })
  @ApiParam({ name: 'sessionId' })
  @ApiResponse({ status: 200, type: RunoffMatchResultResponseDto })
  @ApiResponse({ status: 404, description: 'Sesión no encontrada' })
  async getResult(
    @Param('sessionId') sessionId: string,
  ): Promise<RunoffMatchStatusResponseDto | RunoffMatchResultResponseDto> {
    return this.runoffService.getResult(sessionId);
  }

  @Post('match/:sessionId/enrich-ai')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: 'Genera resúmenes con IA bajo demanda y los persiste en DB',
  })
  @ApiParam({ name: 'sessionId' })
  @ApiResponse({ status: 200, description: 'Enriquecimiento realizado o cacheado' })
  @ApiResponse({ status: 400, description: 'Sesión no terminada' })
  async enrichAi(
    @Param('sessionId') sessionId: string,
  ): Promise<{ enriched: boolean; cached?: boolean; reason?: string }> {
    return this.runoffService.enrichWithAi(sessionId);
  }
}
