import {
  Controller,
  Post,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
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
}
