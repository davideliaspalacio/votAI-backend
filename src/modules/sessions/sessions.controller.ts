import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SessionsService } from './sessions.service';
import { StartSessionDto } from './dto/start-session.dto';
import { SessionResponseDto } from './dto/session.response.dto';

@ApiTags('sessions')
@Controller('session')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('start')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Inicia una sesión anónima de test de afinidad' })
  @ApiResponse({ status: 201, type: SessionResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async start(@Body() dto: StartSessionDto): Promise<SessionResponseDto> {
    return this.sessionsService.startSession(dto);
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Elimina una sesión (derecho de supresión - Ley 1581)',
  })
  @ApiParam({ name: 'sessionId', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 204, description: 'Sesión eliminada' })
  @ApiResponse({ status: 404, description: 'Sesión no encontrada' })
  async delete(@Param('sessionId') sessionId: string): Promise<void> {
    await this.sessionsService.deleteSession(sessionId);
  }
}
